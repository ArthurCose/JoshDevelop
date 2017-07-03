const FileManager = require("./FileManager")

class Project
{
  constructor(core, name)
  {
    this.name = name;
    this.core = core;
    this.fileManager = new FileManager(this);
    this.editors = {};
    this.sessions = [];
  }

  getEditor(path)
  {
    // search for an already open editor
    let editor = this.editors[path];

    // return if an open editor is found
    if(editor)
      return editor;
    
    // get the file referenced to load a new editor
    let fileNode = this.fileManager.getFile(path);

    // failed to find file
    if(!fileNode)
      return;
    
    editor = this.core.createEditor(fileNode);
    this.editors[fileNode.clientPath] = editor;
    editor.project = this; 

    return editor;
  }

  connect(session)
  {
    this.sessions.push(session);

    if(session.project)
      session.project.disconnect(session);
    
    session.setProject(this);

    this.fileManager.sendFolder(session, this.fileManager.root);
  }

  disconnect(session)
  {
    session.setProject(undefined);

    let index = this.sessions.indexOf(session);
    this.sessions.splice(index, 1);
  }

  broadcast(message)
  {
    for(let i = 0; i < this.sessions.length; i++)
      this.sessions[i].send(message);
  }

  // todo
  delete()
  {}
}


module.exports = Project;