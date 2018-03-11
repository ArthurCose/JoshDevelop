import EventRaiser from "./EventRaiser.mjs";

export default class FileNode extends EventRaiser
{
  constructor(name, parentFolder, filetree)
  {
    super();
    this._name = name;
    this.parentFolder = parentFolder;
    this.filetree = filetree;
    this.isFile = true;
    this.deleted = false;

    this.addEvent("unlist");
    this.addEvent("move");

    this.on("unlist", () => this.filetree.triggerEvent("unlist", this));
    this.on("move", () => this.filetree.triggerEvent("move", this));
  }

  get name()
  {
    return this._name;
  }

  set name(value)
  {
    this._name = value;
  }

  get extension()
  {
    let splitName = this.name.split('.');

    let extension = splitName[splitName.length - 1];

    return extension;
  }

  get clientPath()
  {
    let clientPath = this.name;
    let folder = this.parentFolder;

    while(folder != undefined) {
      clientPath = folder.name + "/" + clientPath;
      folder = folder.parentFolder;
    }

    return clientPath;
  }

  get parentClientPath()
  {
    return this.parentFolder ? this.parentFolder.clientPath : "";
  }

  containsChild(name)
  {
    if(this.isFile)
      throw new Error("File can not contain children");

    for(let child of this.children)
      if(child.name == name)
        return true;
    return false;
  }

  markDeleted()
  {
    this.deleted = true;
    this.unlist();
  }

  unlist()
  {
    this.destroy();
    this.triggerEvent("unlist");
  }

  destroy()
  {
    if(this.parentFolder == undefined)
      return;

    let index = this.parentFolder.children.indexOf(this);
    this.parentFolder.children.splice(index, 1);

    this.parentFolder = undefined;
  }
}
