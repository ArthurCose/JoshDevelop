import ClientFolderNode from "./ClientFolderNode.js";
import FileClipboard from "./FileClipboard.js";
import FileTree from "../../shared/FileTree.mjs";
import EventRaiser from "../../shared/EventRaiser.mjs";
import { getParentPath } from "../../shared/PathUtil.mjs";

export default class ClientFileManager extends EventRaiser
{
  constructor(session)
  {
    super();
    this.session = session;
    this.clipboard = new FileClipboard(this);

    this.fileTree = new FileTree(this);
    this.fileTree.root = new ClientFolderNode("", undefined, this.fileTree);

    let root = this.fileTree.root;
    root.controlElement.className += " root";
    root.requestedData = true;
    root.populated = true;
    root.toggleDisplay();

    this.element = document.getElementById("filetree");
    this.element.appendChild(root.controlElement);
    this.element.appendChild(root.listElement);

    this.addEvent("click");
  }

  reset()
  {
    while(this.fileTree.root.children.length > 0)
      this.fileTree.root.children[0].destroy();
  }

  // async
  requestFile(path) {
    return this.requestNode(path, true);
  }

  // async
  requestFolder(path) {
    return this.requestNode(path, false);
  }

  async requestNode(path, isFile)
  {
    if(path == "")
      return undefined;

    let node = this.fileTree.getNode(path, isFile);

    if(node)
      return node;

    let parentPath = getParentPath(path);
    let parentFolder = this.fileTree.getFolder(parentPath);

    if(!parentFolder)
      parentFolder = await this.requestFolder(parentPath);

    if(parentFolder.populated)
      return undefined;

    if(!parentFolder.requestedData)
      parentFolder.requestData();

    await parentFolder.once("populate");

    return this.fileTree.getNode(path, isFile);
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "add":
      this._add(message);
      break;
    case "remove":
      this._remove(message);
      break;
    case "move":
      this._move(message);
      break;
    case "done populating":
      this._donePopulating(message);
      break;
    }
  }

  _add(message)
  {
    this.fileTree.registerNode(message.path, message.isFile);
  }

  _remove(message)
  {
    let node = this.fileTree.getNode(message.path, message.isFile);

    if(node)
      node.markDeleted();
  }

  async _move(message)
  {
    let node = this.fileTree.getNode(message.oldPath, message.isFile);

    // node may not have been downloaded
    // we can ignore this one
    if(!node)
      return;

    let folder = await this.requestFolder(message.parentPath);

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
    this.fileTree.triggerEvent("move", node, message.oldPath);
  }

  _donePopulating(message)
  {
    let folder = this.fileTree.getFolder(message.path);

    if(!folder)
      return;

    folder.populated = true;
    folder.triggerEvent("populate");
  }
}
