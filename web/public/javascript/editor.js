class Editor
{
  constructor(tab, fileNode, id)
  {
    this.element = tab.content;
    this.tab = tab;
    this.fileNode = fileNode;
    this.id = id;
    this.fileNodeListeners = [];

    tab.on("close", () => this.closed());

    this.fileNodeListeners.push(
      fileNode.on("rename", () => this.renamed()),
      fileNode.on("unlist", () => tab.destroy())
    );
  }

  renamed()
  {
    this.tab.identifier = this.fileNode.clientPath;
    this.tab.name = this.fileNode.name;
  }
  
  closed()
  {
    session.send({
      type: "editor",
      action: "close",
      editorId: this.id
    });

    session.editors[this.id] = undefined;

    for(let listener of this.fileNodeListeners)
      listener.destroy();
  }
  
  messageReceived(message)
  {
    console.log(message);
  }
}