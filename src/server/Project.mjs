import ServerFileManager from "./FileManagement/ServerFileManager";

export default class Project
{
  constructor(name, core)
  {
    this.name = name;
    this.core = core;
    this.fileManager = new ServerFileManager(this);
    this.editors = {};
    this.sessions = [];

    let rootNode = this.fileManager.fileTree.root;

    rootNode.on("unlist", () => this.delete());
    rootNode.on("move", () => this.rename(rootNode.name));
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

    this.fileManager.sendFolder(session, this.fileManager.fileTree.root);
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
    this.core.projects.delete(name);
    this.core.projects.set(name, this);

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
    this.core.removeProject(this.name);

    let defaultProject = this.core.getDefaultProject();

    for(let session of this.sessions)
      session.setProject(defaultProject);
  }
}
