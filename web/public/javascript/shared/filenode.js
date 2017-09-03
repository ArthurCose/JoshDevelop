if(typeof EventRaiser == "undefined")
    EventRaiser = require("./eventraiser");

class FileNode extends EventRaiser
{
  constructor(filetree, parentFolder, name, isFile)
  {
    super();
    this.filetree = filetree;
    this.parentFolder = parentFolder;
    this.isFile = isFile;
    this._name = name;
    this.deleted = false;

    this.addEvent("unlist");
    this.addEvent("rename");

    // specific to client file/folder nodes
    // (node, menu)
    this.addEvent("menu");

    this.filetree.triggerEvent("add", this);
    this.on("unlist", () => this.filetree.triggerEvent("unlist", this));
    this.on("rename", () => this.filetree.triggerEvent("rename", this));
  }
  
  get name()
  {
    return this._name;
  }
  
  set name(value)
  {
    this._name = value;
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
  
  containsChild(name)
  {
    if(this.isFile)
      throw "File can not contain children";

    for(let child of this.children)
      if(child.name == name)
        return true;
    return false;
  }
  
  unlink()
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
  }
}

if(typeof module !== "undefined")
    module.exports = FileNode;