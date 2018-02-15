import chokidar from "chokidar";
import path from "path";

export default class FileWatcher
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
        usePolling: true,
        awaitWriteFinish: true
      }
    );

    this.watcher.on("add", (filePath) => this.add(filePath, true));
    this.watcher.on("unlink", (filePath) => this.remove(filePath, true));
    this.watcher.on("addDir", (folderPath) => this.add(folderPath, false));
    this.watcher.on("unlinkDir", (folderPath) => this.remove(folderPath, false));
    this.watcher.on("error", (err) => console.log(err));
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
    nodePath = this.formatPath(nodePath);

    if(nodePath == "")
      return;

    let name = path.basename(nodePath);
    let parentPath = path.dirname(nodePath);

    // ignore root
    if(parentPath == ".")
      return;

    this.fileManager.createNode(parentPath, name, isFile)
                    .catch((err) => {
                      // should only run when the node already exists
                      // the exception is an external program creating files/folders
                    });
  }

  remove(nodePath, isFile)
  {
    nodePath = this.formatPath(nodePath);

    let node = this.fileManager.getNode(nodePath, isFile);

    if(node && !node.deleted)
      node.unlist();
  }

  formatPath(filePath)
  {
    // strip the parent path
    filePath = filePath.substring(this.fileManager.parentPath.length);

    // replace backslashes with forward slashes
    filePath = filePath.split("\\").join("/");

    return filePath;
  }
}
