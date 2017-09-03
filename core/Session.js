"use strict";

const EventRaiser = require("../web/public/javascript/shared/eventraiser");

class Session extends EventRaiser
{
  constructor(core, websocketConnection, user, id)
  {
    super();
    this.core = core;
    this.websocket = websocketConnection;
    this.user = user;
    this.id = id;

    this.project = undefined;
    this.editors = [];
    
    this.socketReady = true;
    this.messageQueue = [];

    this.websocket.on("message", (message) => this.messageReceived(message));
    this.websocket.on("close", () => this.disconnected());
    
    this.addEvent("message");
    this.addEvent("join project");
    this.addEvent("leave project");
    this.addEvent("disconnect");
  }

  init()
  {
    // give the client their ID
    this.send({
      type: "init",
      id: this.id,
      settings: this.user.get("settings")
    });

    // broadcast the addition of this
    // user to update user lists
    this.core.broadcast({
      type: "profile",
      action: "add",
      name: this.user.get("nickname"),
      color: this.user.get("color"),
      sessionID: this.id
    });

    // send session list to this session
    // ignore self as it was received through broadcasted already
    for(let session of this.core.sessions)
      if(session != this)
        this.send({
          type: "profile",
          action: "add",
          name: session.user.get("nickname"),
          color: session.user.get("color"),
          sessionID: session.id
        });
  }

  setProject(project)
  {
    let lastProject = this.project;

    this.project = project;

    this.send({
      type: "project",
      action: "swap",
      name: project.name
    });

    if(lastProject != undefined) {
      lastProject.disconnect(this);
      this.triggerEvent("leave project", lastProject);
    }

    project.connect(this);
    this.triggerEvent("join project", project);
  }

  get fileManager()
  {
    return this.project.fileManager;
  }

  openEditor(path)
  {
    let editor = this.project.getEditor(path);

    if(!editor) {
      this.displayPopup(`No editor available for ${path}`);
      return;
    }

    this.send({
      type: "editor",
      action: "initialize",
      name: editor.name,
      id: this.editors.length
    });

    this.editors.push(editor);

    return editor;
  }
  
  send(message)
  {
    message = JSON.stringify(message);
    
    this.messageQueue.push(message);

    if(this.socketReady)
      this.dequeueMessages();
  }

  dequeueMessages()
  {
    if(this.websocket.state == "closed")
      return;

    let message = this.messageQueue.shift();

    this.socketReady = false;

    this.websocket.sendUTF(message, () => {
      this.socketReady = true;

      if(this.messageQueue.length > 0)
        this.dequeueMessages();
    });
  }
  
  displayPopup(message)
  {
    message = {
      type: "popup",
      message: message
    };
    
    this.send(message);
  }
  
  messageReceived(message)
  {
    try {
      message = JSON.parse(message.utf8Data);
      
      switch(message.type) {
      case "editor":
        let editor = this.editors[message.editorId] ||
                     this.openEditor(message.path);

        if(editor)
          editor.messageReceived(this, message);
        
        break;
      case "filemanager":
        this.fileManager.messageReceived(this, message);
        break;
      case "project":
        this.core.messageReceived(this, message);
        break;
      case "settings":
        let settings = this.user.get("settings");
        settings[message.section] = message.data;
        this.user.set("settings", settings);
        break;
      case "profile":
        if(message.action != "update")
          return;

        this.user.set("nickname", message.name);
        this.user.set("color", message.color);

        this.core.broadcast({
          type: "profile",
          action: "update",
          name: message.name,
          color: message.color,
          sessionID: this.id
        });
        break;
      }

      this.triggerEvent("message", message);
    }
    catch(e)
    {
      console.log(message)
      console.log("\n");
      console.log(e);
      // some error that could've crashed the server
      // I'm assuming it wasn't me, and was someone trying
      // to be malicious
    }
  }
  
  closeOpenedEditors()
  {
    for(let editor of this.editors)
      if(editor)
        editor.removeSession(this);
  }

  disconnected()
  {
    this.closeOpenedEditors();

    let index = this.core.sessions.indexOf(this);
    this.core.sessions.splice(index, 1);
    
    this.core.broadcast({
      type: "profile",
      action: "remove",
      sessionID: this.id
    });

    this.triggerEvent("disconnect");
  }
}

module.exports = Session;