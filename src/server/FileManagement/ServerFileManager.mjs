import FileTree from "../../shared/FileTree";
import FileWatcher from "./FileWatcher";
import ServerFolderNode from "./ServerFolderNode";
import getFileNameErrors from "./getFileNameErrors";

export default class ServerFileManager
{
  constructor(project)
  {
    this.project = project;
    this.parentPath = "projects/";

    this.fileTree = new FileTree(this);
    this.fileTree.root =
      new ServerFolderNode(project.name, undefined, this.fileTree);
    this.fileTree.root.make();

    this.fileWatcher = new FileWatcher(this);
  }

  getFile(path)
  {
    return this.fileTree.getFile(path);
  }

  getFolder(path)
  {
    return this.fileTree.getFolder(path);
  }

  getNode(path, isFile)
  {
    return this.fileTree.getNode(path, isFile);
  }

  async createNode(parentPath, name, isFile)
  {
    // check for name errors
    let nameErrors = getFileNameErrors(name);

    if(nameErrors)
      throw new Error(nameErrors);

    // get the parent folder
    let parentFolder = this.getFolder(parentPath);

    // test for errors
    if(!parentFolder)
      throw new Error("Parent folder is undefined.");
    if(parentFolder.containsChild(name))
      throw new Error(`${parentPath}/${name} already exists.`);

    let node = isFile ? parentFolder.registerFile(name) :
                        parentFolder.registerSubFolder(name);

    // create the node  
    try{
      await node.make();
    } catch(err) {
      node.destroy();
      throw err;
    }

    this.project.broadcast({
      type: "filemanager",
      action: "add",
      isFile: node.isFile,
      path: node.clientPath
    });

    return node;
  }

  refresh(path)
  {
    let folder = this.getFolder(path);

    // folder must've been deleted before we received
    // this message
    if(!folder)
      return;

    // unlist folder if it is not the root
    // otherwise unlist children
    if(folder.parentFolder)
      folder.unlist();
    else
      while(folder.children.length > 0)
        folder.children[0].unlist();

    // restart the filewatcher to repopulate the tree
    this.fileWatcher.restart();
  }

  sendFolder(session, folder)
  {
    for(let childNode of folder.children) {
      // send the node
      session.send({
        type: "filemanager",
        action: "add",
        isFile: childNode.isFile,
        path: childNode.clientPath
      });
    }

    // signal end
    session.send({
      type: "filemanager",
      action: "done populating",
      path: folder.clientPath
    });
  }

  async emptyFolder(path)
  {
    let folder = this.getFolder(path);

    if(folder)
      await folder.empty();
  }

  async messageReceived(session, message)
  {
    let folder, node;

    switch(message.action) {
    case "add":
      await this.createNode(
        message.parentPath,
        message.name,
        message.isFile
      );
      break;
    case "delete":
      node = this.getNode(message.path, message.isFile);

      if(node)
        await node.unlink();
      break;
    case "empty":
      await this.emptyFolder(message.path);
      break;
    case "copy":
    case "move":
      folder = this.getFolder(message.parentPath);

      if(folder == undefined)
        break;

      node = this.getNode(message.path, message.isFile);

      if(node)
        await node[message.action](folder, message.name);
      break;
    case "rename":
      node = this.getNode(message.path, message.isFile);

      if(node)
        await node.rename(message.name);
    case "refresh":
      this.refresh(message.path);
      break;
    case "request":
      folder = this.getFolder(message.path);

      if(folder == undefined)
        break;

      this.sendFolder(session, folder);
      break;
    }
  }
}
