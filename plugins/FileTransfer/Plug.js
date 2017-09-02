const Plugin = require("../../core/Plugin");
const fs = require("fs-extra");
const archiver = require("archiver");

class FileTransferPlugin extends Plugin
{
  constructor(core)
  {
    super(core);
    this.publicPath = "public";
    this.localScripts = ["init.js"];
  }

  extraRouting(express, app)
  {
    app.get("/download", (req, res) => this.download(req, res));
    app.post("/upload", (req, res) => this.upload(req, res));
  }
  
  download(req, res)
  {
    let invalidPath = typeof req.query.path == "undefined";
  
    if(invalidPath) {
      res.status(400).end();
      return;
    }
  
    let filePath = `projects/${req.query.path}`;
  
    fs.stat(filePath).then((stats) => {
      if(stats.isDirectory()) {
        let archive = archiver.create("zip");
        archive.pipe(res);
        archive.directory(filePath);
        archive.finalize();
      }
      else {
        res.download(filePath);
      }
    }).catch((err) => {
      res.status(500).send(err);
    })
  }
  
  upload(req, res)
  {
    let parentPath = req.query.parentPath;
    let projectName = req.query.project;
    let project = this.core.projects[projectName];
  
    if(!project) {
      res.status(400).send(`Project "${projectName}" does not exist.`);
      return;
    }
  
    if(req.busboy == undefined) {
      res.status(500).send(`Busboy is missing.`);
      return;
    }
  
    let parentFolder = project.fileManager.getFolder(parentPath);
  
    if(parentFolder == undefined) {
      res.status(400).send(`${parentPath} is not a folder.`);
      return;
    }
  
    let errors = 0;
    let filecount = 0;
  
    req.busboy.on("file", (fieldname, filestream, filename, encoding, mimetype) => {
      this.uploadFile(project.fileManager, parentFolder, filename, filestream)
        .catch((err) => {
          errors++;
          filestream.resume();
        });
  
      filecount++;
    });
  
    req.busboy.on("finish", function () {
      let completed = filecount - errors;
  
      res.send(
        `${completed}/${filecount} File(s) uploaded\n` +
        `(${errors}) errors.`
      );
    });
  
    req.pipe(req.busboy);
  }
  
  async uploadFile(fileManager, parentFolder, filename, readStream)
  {
    await fileManager.createNode(parentFolder.clientPath, filename, true);
  
    let filePath = parentFolder.clientPath + "/" + filename;
    let fileNode = fileManager.getFile(filePath);
  
    if(fileNode == undefined)
      throw "Couldn't get file by path";
  
    let writeStream = fs.createWriteStream(fileNode.serverPath);
    readStream.pipe(writeStream);
  }
}

module.exports = FileTransferPlugin;