import ServerFileNode from "./ServerFileNode";
import fs from "fs-extra";

export default class ServerFolderNode extends ServerFileNode
{
  constructor(name, parentFolder, filetree)
  {
    super(name, parentFolder, filetree);
    this.isFile = false;
    this.children = [];
  }

  async make()
  {
    try{
      await fs.mkdir(this.serverPath);
    } catch(err) {
      // rethrow the error if it is not a file already exists error
      if(err.code != "EEXIST")
        throw err;

      // get file info
      let stats = await fs.stat(this.serverPath);

      // if it's a file throw an error
      if(stats.isFile())
        throw new Error(`"${this.clientPath}" already exists as a file.`);
    }
  }

  registerSubFolder(name)
  {
    let folder = new ServerFolderNode(name, this, this.filetree);
    this.registerNode(folder);

    this.filetree.triggerEvent("add", folder);

    return folder;
  }

  registerFile(name)
  {
    let file = new ServerFileNode(name, this, this.filetree);
    this.registerNode(file);

    this.filetree.triggerEvent("add", file);

    return file;
  }

  registerNode(node)
  {
    this.children.push(node);
  }

  unlist()
  {
    // unlist children
    while(this.children.length > 0)
      this.children[0].unlist();

    super.unlist();
  }

  async empty()
  {
    let skipped = 0;

    while(this.children.length > skipped) {
      // try to delete this child, if it fails
      // increment skipped to skip it
      // failed deletions will remain in the front
      try{
        await this.children[skipped].unlink()
      } catch(err) {
        skipped++;
      }
    }

    if(skipped > 0)
      throw new Error(`${skipped} errors occurred while emptying "${this.clientPath}"`);
  }
}
