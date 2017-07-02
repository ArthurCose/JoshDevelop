"use strict";

const chokidar = require('chokidar');
const path = require('path');

class FileWatcher
{
  constructor(fileManager)
  {
    this.fileManager = fileManager;
    this.start();
  }

  start()
  {
    if(this.watcher)
      return;

    this.watcher = chokidar.watch(
      this.fileManager.root.serverPath,
      {
        persistent: true,
        usePolling: true
      }
    );

    this.watcher.on('add', (filePath) => this.add(filePath, true));
    this.watcher.on('unlink', (filePath) => this.remove(filePath, true));
    this.watcher.on('addDir', (folderPath) => this.add(folderPath, false));
    this.watcher.on('unlinkDir', (folderPath) => this.remove(folderPath, false));
    this.watcher.on('error', (err) => console.log(err));
  }
  
  stop()
  {
    this.watcher.close();
    this.watcher = undefined;
  }

  restart()
  {
    this.stop();
    this.start();
  }
  
  add(nodePath, isFile)
  {
    nodePath = this.stripBasePath(nodePath);
    
    if(nodePath == "")
      return;

    let name = path.basename(nodePath);
    let parentPath = path.dirname(nodePath);
	
    this.fileManager.createNode(parentPath, name, isFile).catch(() => {});
  }
  
  remove(nodePath, isFile)
  {
    nodePath = this.stripBasePath(nodePath);
	
    if(nodePath == "")
      console.error("Project folder was deleted");

    let node = this.fileManager.getNode(nodePath, isFile);
     
    if(node)
      node.unlist();
  }

  stripBasePath(filePath)
  {
    // strip the parent path
    filePath = filePath.substring(this.fileManager.parentPath.length);

    // replace backslashes with forward slashes
    filePath = filePath.split("\\").join("/");

    return filePath;
  }
}

module.exports = FileWatcher;
