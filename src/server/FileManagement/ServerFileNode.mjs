import FileNode from "../../shared/FileNode";
import getFileNameErrors from "./getFileNameErrors";
import fs from "fs-extra";

export default class ServerFileNode extends FileNode
{
  constructor(name, parentFolder, fileTree)
  {
    super(name, parentFolder, fileTree);
  }

  /**
   * @returns {string}
   */
  get serverPath()
  {
    return this.fileTree.manager.parentPath + this.clientPath;
  }

  async make()
  {
    try{
      await fs.createFile(this.serverPath);
    } catch(err) {
      // rethrow the error if it is not a file already exists error
      if(err.code != "EEXIST")
        throw err;

      // get file info
      let stats = await fs.stat(this.serverPath);

      // if this is a folder throw an error
      if(!stats.isFile())
        throw new Error(`"${this.clientPath}" already exists as a folder.`);
    }
  }

  /**
   * @param {string} newName
   */
  async rename(newName)
  {
    await this.move(this.parentFolder, newName);
  }

  /**
   * @param {ServerFolderNode} folder
   * @param {string} newName
   */
  async move(folder, newName)
  {
    let oldPath = this.clientPath;

    let error = getFileNameErrors(newName);

    if(error)
      throw new Error(error);

    let destination =
      folder == undefined
        ? this.fileTree.manager.parentPath + "/" + newName
        : folder.serverPath + "/" + newName;

    await fs.move(this.serverPath, destination);

    // renaming the root node will cause the
    // folder parameter to be undefined
    // this code is unnecessary in that case
    if(folder) {
      // detach from parent
      this.destroy();

      // attach to the new parent
      this.parentFolder = folder;
      folder.children.push(this);
    }

    this.name = newName;

    this.fileTree.manager.project.broadcast({
      type: "filemanager",
      action: "move",
      oldPath: oldPath,
      parentPath: this.parentClientPath,
      isFile: this.isFile,
      newName: newName
    });

    this.triggerEvent("move", oldPath);
    this.fileTree.triggerEvent("move", this, oldPath);
  }

  /**
   * @param {ServerFolderNode} folder
   * @param {string} newName
   */
  async copy(folder, newName)
  {
    let error = getFileNameErrors(newName);

    if(error)
      throw new Error(error);

    let destination =
      folder == undefined
        ? this.fileTree.manager.parentPath + "/" + newName
        : folder.serverPath + "/" + newName;

    await fs.copy(this.serverPath, destination);

    // the file watcher should create a new node and trigger an add event
  }

  async unlink()
  {
    try{
      await fs.remove(this.serverPath);
    } catch(err) {
      // rethrow the error if it is not a file missing error
      if(err.code != "ENOENT")
        throw err;
    }

    this.markDeleted();
  }

  unlist()
  {
    if(this.parentFolder != undefined)
      this.fileTree.manager.project.broadcast({
        type: "filemanager",
        action: "remove",
        isFile: this.isFile,
        path: this.clientPath
      });

    super.unlist();
  }
}
