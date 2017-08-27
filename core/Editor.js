"use strict";

class Editor
{
  /**
   * classes that extend this class should have only core and fileNode
   * in their constructors
   * 
   * @param {string} name Used to get the client class in session.editorDictionary
   * @param {Core} project
   * @param {ServerFileNode} fileNode
   */
  constructor(name, project, fileNode)
  {
    this.project = project;
    this.fileNode = fileNode;
    this.name = name;
    this.path = fileNode.clientPath;
    this.connectedSessions = [];
    this.destroyed = false;

    this.eventListeners = [
      fileNode.on("rename", () => this.fileRenamed()),
      fileNode.on("unlist", () => this.destroy())
    ];
  }

  getSupportLevelFor(fileNode)
  {
    return 0;
  }
  
  fileRenamed()
  {
    delete this.project.editors[this.path];

    this.path = this.fileNode.clientPath;

    this.project.editors[this.path] = this;
  }

  /**
   * 
   * @param {Session} session 
   */
  addSession(session)
  {
    this.connectedSessions.push(session);
  }
  
  removeSession(session)
  {
    let index = this.connectedSessions.indexOf(session);
    this.connectedSessions.splice(index, 1);
    
    index = session.editors.indexOf(this);
    session.editors[index] = undefined;
    
    if(this.connectedSessions.length == 0)
      this.destroy();
  }

  destroy()
  {
    if(this.destroyed)
      return;
    
    for(let listener of this.eventListeners)
      listener.destroy();

    delete this.project.editors[this.path];
    this.destroyed = true;
  }

  broadcast(sessionIgnore, message)
  {
    for(let session of this.connectedSessions)
      if(session.id != sessionIgnore.id)
      {
        message.editorId = session.editors.indexOf(this);
        session.send(message);
      }
  }

  messageReceived(session, message)
  {
    switch(message.action)
    {
    case "join":
      this.addSession(session);
      break;
    case "close":
      this.removeSession(session);
      break;
    }
  }
}

module.exports = Editor;