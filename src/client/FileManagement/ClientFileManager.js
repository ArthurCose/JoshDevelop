import ClientFolderNode from "./ClientFolderNode.js";
import FileClipboard from "./FileClipboard.js";
import FileTree from "../../shared/FileTree.mjs";
import { getParentPath } from "../../shared/PathUtil.mjs";

export default class ClientFileManager extends FileTree
{
  constructor(session)
  {
    super();
    this.session = session;
    this.clipboard = new FileClipboard(this);

    this.root = new ClientFolderNode("", undefined, this);
    this.root.controlElement.className += " root";
    this.root.requestedData = true;
    this.root.populated = true;
    this.root.toggleDisplay();

    this.element = document.getElementById("filetree");
    this.element.appendChild(this.root.controlElement);
    this.element.appendChild(this.root.listElement);
    
    this.addEvent("click");
  }

  reset()
  {
    while(this.root.children.length > 0)
      this.root.children[0].destroy();
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

    let node = this.getNode(path, isFile);

    if(node)
      return node;

    let parentPath = getParentPath(path);
    let parentFolder = this.getFolder(parentPath);

    if(!parentFolder)
      parentFolder = await this.requestFolder(parentPath);

    if(parentFolder.populated)
      return undefined;

    if(!parentFolder.requestedData)
      parentFolder.requestData();

    await parentFolder.once("populate");

    return this.getNode(path, isFile);
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
    this.registerNode(message.path, message.isFile);
  }

  _remove(message)
  {
    let node = this.getNode(message.path, message.isFile);

    if(node)
      node.markDeleted();
  }

  async _move(message)
  {
    let node = this.getNode(message.oldPath, message.isFile);

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
  }

  _donePopulating(message)
  {
    let folder = this.getFolder(message.path);

    folder.populated = true;
    folder.triggerEvent("populate");
  }
}
