import FileNode from "../../shared/FileNode";
import getFileNameErrors from "./getFileNameErrors";
import fs from "fs-extra";

export default class ServerFileNode extends FileNode
{
  constructor(name, parentFolder, filetree)
  {
    super(name, parentFolder, filetree);
  }

  /**
   * @returns {string}
   */
  get serverPath()
  {
    return this.filetree.parentPath + this.clientPath;
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
    await move(this.parentFolder, newName);
  }

  /**
   * @param {ServerFolderNode} folder
   * @param {string} newName
   */
  async move(folder, newName)
  {
    let oldName = this.name;
    let oldPath = this.clientPath;

    let error = getFileNameErrors(newName);

    if(error)
      throw new Error(error);

    let destination = folder == undefined ?
                      this.filetree.parentPath + "/" + newName :
                      folder.serverPath + "/" + newName;

    await fs.move(this.serverPath, destination);

    // detach from parent
    this.destroy();

    this.name = newName;
    this.parentFolder = folder;
    folder.children.push(this);

    this.filetree.project.broadcast({
      type: "filetree",
      action: "move",
      oldPath: oldPath,
      parentPath: this.parentClientPath,
      isFile: this.isFile,
      newName: newName
    });

    this.triggerEvent("move", oldName);
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

    let destination = folder == undefined ?
                      this.filetree.parentPath + "/" + newName :
                      folder.serverPath + "/" + newName;

    await fs.copy(this.serverPath, destination);

    // our file watcher should create a new node and trigger an add event
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
      this.filetree.project.broadcast({
        type: "filetree",
        action: "remove",
        isFile: this.isFile,
        path: this.clientPath
      });

    super.unlist();
  }
}
