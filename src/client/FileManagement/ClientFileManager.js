import ClientFolderNode from "./ClientFolderNode.js";
import FileClipboard from "./FileClipboard.js";
import FileTree from "../../shared/FileTree.mjs";

export default class ClientFileManager extends FileTree
{
  constructor(session)
  {
    super();
    this.session = session;

    this.root = new ClientFolderNode("", undefined, this);
    this.clipboard = new FileClipboard(this);
    this.listeners = [];

    this.element = document.getElementById("filetree");

    this.root.controlElement.className += " root";
    this.root.toggleDisplay();

    this.element.appendChild(this.root.controlElement);
    this.element.appendChild(this.root.listElement);
    
    this.addEvent("click");
  }

  reset()
  {
    while(this.root.children.length > 0)
      this.root.children[0].destroy();
  }

  messageReceived(message)
  {
    let folder, node;

    switch(message.action) {
    case "add":
      node = this.registerNode(message.path, message.isFile);

      node.on("click", (button) => this.triggerEvent("click", node, button));
      break;
    case "remove":
      node = this.getNode(message.path, message.isFile);

      if(node)
        node.markDeleted();
      break;
    case "move":
      folder = this.getFolder(message.parentPath);
      node = this.getNode(message.oldPath, message.isFile);
      node.name = message.newName;

      // folder might be undefined due to renaming the root node
      if(folder) {
        // detach the element for the node,
        // and orphanize it
        node.destroy();

        node.parentFolder = folder;
        folder.insertNode(node);
        node.append();
      }

      node.triggerEvent("move", message.oldPath);
      break;
    }
  }
}
