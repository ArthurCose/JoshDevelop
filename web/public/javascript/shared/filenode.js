if(typeof EventRaiser == 'undefined')
    EventRaiser = require("./eventraiser");

class FileNode extends EventRaiser
{
  constructor(filetree, parentFolder, name)
  {
    super();
    this.filetree = filetree;
    this.parentFolder = parentFolder;
    this.isFile = true;
    this._name = name;
    this.deleted = false;

    this.addEvent("unlist");
    this.addEvent("rename");
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
    
    while(folder != undefined)
    {
      clientPath = folder.name + '/' + clientPath;
      folder = folder.parentFolder;
    }

    return clientPath;
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

if(typeof module !== 'undefined')
    module.exports = FileNode;