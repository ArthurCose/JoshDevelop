export default class Editor
{
  constructor(id, fileNode, tab, session)
  {
    this.id = id;
    this.fileNode = fileNode;
    this.fileNodeListeners = [];
    this.tab = tab;
    this.session = session;
    this.element = tab.content;

    tab.on("active", () => this.session.profile.location = this.fileNode.clientPath);
    tab.on("close", () => this.closed());

    this.fileNodeListeners.push(
      fileNode.on("move", () => this.moved()),
      fileNode.on("unlist", () => tab.destroy())
    );
  }

  moved()
  {
    if(this.tab.isActive)
      this.session.profile.location = this.fileNode.clientPath;

    this.tab.identifier = this.fileNode.clientPath;
    this.tab.name = this.fileNode.name;
  }

  closed()
  {
    this.session.editors[this.id] = undefined;

    for(let listener of this.fileNodeListeners)
      listener.destroy();

    if(this.session.editorTabs.tabs.length == 0)
      this.session.profile.location = "";

    this.session.send({
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
