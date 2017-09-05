class Editor
{
  constructor(tab, fileNode, id)
  {
    this.element = tab.content;
    this.tab = tab;
    this.fileNode = fileNode;
    this.id = id;
    this.fileNodeListeners = [];

    tab.on("active", () => session.profile.location = this.fileNode.clientPath);
    tab.on("close", () => this.closed());

    this.fileNodeListeners.push(
      fileNode.on("rename", () => this.renamed()),
      fileNode.on("unlist", () => tab.destroy())
    );
  }

  renamed()
  {
    if(this.tab.isActive)
      session.profile.location = this.fileNode.clientPath;

    this.tab.identifier = this.fileNode.clientPath;
    this.tab.name = this.fileNode.name;
  }
  
  closed()
  {
    session.editors[this.id] = undefined;

    for(let listener of this.fileNodeListeners)
      listener.destroy();

    if(session.editorTabs.tabs.length == 0)
      session.profile.location = "";

    session.send({
      type: "editor",
      action: "close",
      editorId: this.id
    });
  }
  
  messageReceived(message)
  {
    console.log(message);
  }
}