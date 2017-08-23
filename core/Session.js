"use strict";

const EventRaiser = require('../web/public/javascript/shared/eventraiser');

class Session extends EventRaiser
{
  constructor(core, websocketConnection, id)
  {
    super();
    this.websocket = websocketConnection;
    this.core = core;
    this.id = id;
    this.name = "Anonymous";
    this.color = this.generateColor();
    this.project = undefined;
    this.editors = [];
    
    this.websocket.on('message', (message) => this.messageReceived(message));
    this.websocket.on('close', () => this.disconnected());
    
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
      id: this.id
    });

    // broadcast the addition of this
    // user to update user lists
    this.core.broadcast({
      type: "profile",
      action: "add",
      name: this.name,
      color: this.color,
      sessionID: this.id
    });

    // send session list to this session
    // ignore self as it was received through broadcasted already
    for(let session of this.core.sessions)
      if(session != this)
        this.send({
          type: "profile",
          action: "add",
          name: session.name,
          color: session.color,
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

    if(lastProject != undefined)
    {
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

  generateColor()
  {
    let maxCount = 0;
    let color = "#";

    for(let i = 0; i < 3; i++)
    {
      if(maxCount < 2 && Math.random() > .5)
      {
        color += 'F0';
        maxCount++;
      }
      else
      {
        color += '00';
      }
    }

    // reroll if we get black;
    return color == "#000000" ? this.generateColor() : color;
  }

  openEditor(path)
  {
    let editor = this.project.getEditor(path);

    if(!editor)
    {
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
    
    this.websocket.sendUTF(message);
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
    try
    {
      message = JSON.parse(message.utf8Data);
      
      switch(message.type)
      {
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
      case "profile":
        if(message.action != "update")
          return;

        this.name = message.name;
        this.color = message.color;

        this.core.broadcast({
          type: "profile",
          action: "update",
          name: this.name,
          color: this.color,
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