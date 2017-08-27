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

    this.fileManager.root.on("unlist", () => this.delete());
    this.fileManager.root.on("rename", () => this.rename(this.fileManager.root.name));
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
    
    editor = this.core.createEditor(this, fileNode);
    this.editors[fileNode.clientPath] = editor;

    return editor;
  }

  connect(session)
  {
    this.sessions.push(session);

    this.fileManager.sendFolder(session, this.fileManager.root);
  }

  disconnect(session)
  {
    let index = this.sessions.indexOf(session);
    this.sessions.splice(index, 1);
  }

  broadcast(message)
  {
    for(let session of this.sessions)
      session.send(message);
  }

  rename(name)
  {
    delete this.core.projects[this.name];
    this.core.projects[name] = this;

    this.core.broadcast({
      type: "project",
      action: "rename",
      oldName: this.name,
      newName: name
    });

    this.name = name;
  }

  delete()
  {
    this.core.deleteProject(this.name);

    let projectList = Object.values(this.core.projects);
    let firstProject = projectList[0];

    for(let session of this.sessions)
      session.setProject(firstProject);
  }
}


module.exports = Project;