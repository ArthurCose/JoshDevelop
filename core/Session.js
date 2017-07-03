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
    this.send({
      type: "init",
      id: this.id
    });

    this.core.broadcast({
      type: "user add",
      name: this.name,
      color: this.color,
      userid: this.id
    });

    for(let session of this.core.sessions)
      if(session != this)
        this.send({
          type: "user add",
          name: session.name,
          color: session.color,
          userid: session.id
        });
  }

  setProject(project)
  {
    let lastProject = this.project;

    this.project = project;

    if(project)
    {
      this.send({
        type: "project swap",
        name: project.name
      });

      this.triggerEvent("join project", project);
    }
    else
    {
      this.triggerEvent("leave project", lastProject);
    }
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
      this.displayPopup("No editor available for " + path);
      return;
    }

    this.send({
      type: "initialize editor",
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
      case "project swap":
        this.core.projects[message.name].connect(this);
        break;
      case "user update":
        this.name = message.name;
        this.color = message.color;

        this.core.broadcast({
          type: "user update",
          name: this.name,
          color: this.color,
          userid: this.id
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
      type: "user remove",
      userid: this.id
    });

    this.triggerEvent("disconnect");
  }
}

module.exports = Session;