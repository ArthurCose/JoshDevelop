"use strict";

const FileTree = require('../web/public/javascript/shared/filetree');
const FileNode = require('../web/public/javascript/shared/filenode');
const FileWatcher = require('./FileWatcher');
const fs = require('fs-promise');
const path = require('path');


class ServerFileNode extends FileNode
{
  get serverPath()
  {
    return this.filetree.parentPath + this.clientPath;
  }
  
  async make()
  {
    let fileExists = false;

    await fs.open(this.serverPath, "wx")
      .then((fd) => fs.close(fd))
      .catch((err) => {
        // already exists
        if(err.code == "EEXIST")
          fileExists = true;
        else // failure
          throw err.message;
    });

    if(fileExists)
    {
      let stats = await fs.stat(this.serverPath);
      
      if(!stats.isFile())
        throw `${this.serverPath} exists as a folder.`;
    }
  }

  async rename(newName)
  {
    let newPath = this.parentFolder.serverPath + '/' + newName;
    
    await fs.move(this.serverPath, newPath).catch((err) => {
      throw err.message;
    });

    this.filetree.project.broadcast({
      type: 'filetree',
      action: 'rename',
      oldPath: this.clientPath,
      isFile: this.isFile,
      newName: newName
    });

    this.name = newName;
    this.triggerEvent("rename");
  }
  
  async delete()
  {
    await fs.remove(this.serverPath)
            .then(() => this.unlink())
            .catch((err) => {
              if(err.code == "ENOENT")
                this.unlink();
              else
                throw err.message;
            });
  }

  unlist()
  {
    this.filetree.project.broadcast({
      type: "filetree",
      action: "remove",
      isFile: this.isFile,
      path: this.clientPath
    });

    super.unlist();
  }
}

class ServerFolderNode extends ServerFileNode
{
  constructor(filetree, parentFolder, name)
  {
    super(filetree, parentFolder, name);
    this.isFile = false;
    this.children = [];
  }
  
  async make()
  {
    let fileExists = false;

    await fs.mkdir(this.serverPath).catch((err) => {
      if(err.code == "EEXIST")
        // file exists
        fileExists = true;
      else if(err.code == "ENOENT")
        // folder doesn't exist
        throw `${this.serverPath}  does not exist.`;
      else
        // failure
        throw err.message;
    });

    if(fileExists)
    {
      let stats = await fs.stat(this.serverPath);

      // if it's a file throw an error
      if(stats.isFile())
          throw `${this.serverPath} exists as a file.`;
    }
  }
  
  registerSubFolder(name)
  {
    let folder = new ServerFolderNode(this.filetree, this, name);
    this.children.push(folder);
    
    return folder;
  }
  
  registerFile(name)
  {
    let file = new ServerFileNode(this.filetree, this, name);
    this.children.push(file);
    
    return file;
  }

  containsChild(name)
  {
    for(let child of this.children)
      if(child.name == name)
        return true;
    return false;
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

    while(this.children.length > skipped)
    {
      // try to delete this child, if it fails
      // increment skipped to skip it
      // failed deletions will remain in the front
      await this.children[skipped].delete().catch(() => skipped++);
    }

    if(skipped > 0)
      throw `${skipped} errors occurred while emptying ${this.clientPath}`
  }
}

class FileManager extends FileTree
{
  constructor(project)
  {
    super();
    this.root = new ServerFolderNode(this, undefined, project.name);
    this.project = project;
    this.parentPath = "projects/";
    this.checkRootFolder();

    this.fileWatcher = new FileWatcher(this);
  }
  
  checkRootFolder()
  {
    let rootStats = fs.statSync(this.root.serverPath);
    
    if(!rootStats.isDirectory())
      throw new Error(`${this.root.serverPath} is not a directory`);
  }
  
  sendFolder(session, folder)
  {
    for(let childFolder of folder.children)
    {
      session.send({
        type: "filetree",
        action: "add",
        isFile: childFolder.isFile,
        path: childFolder.clientPath
      });
      
      if(!childFolder.isFile)
        this.sendFolder(session, childFolder);
    }
  }

  async createNode(parentPath, name, isFile)
  {
    let parentFolder = this.getFolder(parentPath);
    name = this.cleanName(name);
    let nameErrors = this.validateName(name);

    if(!parentFolder)
      throw "Parent folder is undefined.";
    if(parentFolder.containsChild(name))
      throw `${parentPath}/${name} already exists.`;
    if(nameErrors)
      throw nameErrors;
    
    let node = isFile ? parentFolder.registerFile(name) :
                        parentFolder.registerSubFolder(name);

    await node.make().catch((err) => {
      node.destroy();
      throw err.message;
    });

    this.project.broadcast({
      type: "filetree",
      action: "add",
      isFile: node.isFile,
      path: node.clientPath
    });
  }

  validateName(name)
  {
    let bannedCharRegex = /[\\\/*?"<>|]/;

    if(name.includes(path.sep))
      return `Name can not contain path separators (${path.sep})`;
    if(name == "")
      return "Name can not be blank.";
  }

  cleanName(name)
  {
    let root = path.dirname(require.main.filename);

    // intentionally breaks relative paths
    return path.resolve(name).slice(root.length + 1);
  }
  
  messageReceived(session, message)
  {
    let node, folder;

    switch(message.action)
    {
    case "add":
      let err = this.createNode(
        message.parentPath,
        message.name,
        message.isFile
      ).catch((err) => {
        session.displayPopup(err);
      });
      break;
    case "delete":
      node = this.getNode(message.path, message.isFile);
      
      if(node)
        node.delete().catch((err) => {
          session.send(err);
        });
      break;
    case "empty":
      folder = this.getFolder(message.path);

      if(folder)
        folder.empty();
      break;
    case "rename":
      node = this.getNode(message.oldPath, message.isFile);
      let newName = this.cleanName(message.newName);

      let error = this.validateName(newName);

      if(error)
      {
        session.displayPopup(error);
      }
      else
      {
        node.rename(newName).catch((err) => {
          session.displayPopup(err);
        });
      }
      break;
    case "paste":
      folder = this.getFolder(message.parentPath);
      node = this.getNode(message.path, message.isFile);
      let operation = message.cut ? "move" : "copy";
      let destination = folder.clientPath + "/" + node.name;
      let destinationNode = this.getNode(destination, message.isFile);

      if(folder == undefined)
        return;
      if(destinationNode != undefined)
      {
        session.displayPopup(
          `"${destination}" already exists.\n` +
          `Could not move "${message.path}"`
        );
        return;
      }
      
      fs[operation](node.serverPath, this.parentPath + destination).catch((err) => {
        session.displayPopup(err.message);
      });
      break;
    case "refresh":
      folder = this.getFolder(message.path);

      // folder must've been deleted before we received
      // this message
      if(!folder)
        break;
      
      // unlist folder if it is not the root
      // otherwise unlist children
      if(folder.parentFolder)
        folder.unlist();
      else
        while(folder.children.length > 0)
          folder.children[0].unlist();
      
      // restart the filewatcher to repopulate the tree
      this.fileWatcher.restart();
      break;
    }
  }
}


module.exports = FileManager;