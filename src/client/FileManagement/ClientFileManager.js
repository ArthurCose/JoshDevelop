import ClientFolderNode from "./ClientFolderNode.js";
import FileClipboard from "./FileClipboard.js";
import FileTree from "../../shared/FileTree.mjs";

export default class ClientFileManager extends FileTree
{
  constructor(session)
  {
    super();
    this.addEvent("click");
    this.session = session;

    this.root = new ClientFolderNode("", undefined, this);
    this.clipboard = new FileClipboard(this);
    this.listeners = [];

    this.element = document.getElementById("filetree");

    this.root.controlElement.className += " root";
    this.root.toggleDisplay();

    this.element.appendChild(this.root.controlElement);
    this.element.appendChild(this.root.listElement);
  }

  reset()
  {
    while(this.root.children.length > 0)
      this.root.children[0].destroy();
  }

  messageReceived(e)
  {
    let folder, node;

    switch(e.action) {
    case "add":
      node = this.registerNode(e.path, e.isFile);

      node.controlElement.addEventListener("click", () => this.triggerEvent("click", node));
      break;
    case "remove":
      node = this.getNode(e.path, e.isFile);

      if(node)
        node.markDeleted();
      break;
    case "move":
      folder = this.getFolder(e.parentPath);
      node = this.getNode(e.oldPath, e.isFile);
      node.name = e.newName;

      // detach the element for the node,
      // and orphanize it
      node.destroy();

      node.parentFolder = folder;
      folder.insertNode(node);
      node.append();

      node.triggerEvent("move");
      break;
    }
  }
}
