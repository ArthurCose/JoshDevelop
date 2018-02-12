import Plugin from "../../src/server/Plugin";
import archiver from "archiver";
import fs from "fs-extra";
import path from "path";

export default class FileTransferPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.clientEntry = "Entry.js";
  }

  addDynamicRoutes(server)
  {
    server.addDynamicRoute("/download", this.download);
    server.addDynamicRoute("/upload", async (ctx, next) => await this.upload(ctx, next));
  }

  async download(ctx, next)
  {
    let requestedPath = ctx.request.query.path;
    let invalidPath = typeof requestedPath == "undefined";

    if(invalidPath) {
      ctx.status = 400;
      return;
    }

    let filePath = `projects/${requestedPath}`;
    let fileName = path.basename(requestedPath);

    let stats = await fs.stat(filePath);

    try{
      if(stats.isDirectory()) {
        let archive = archiver.create("zip");
        archive.directory(filePath);
        archive.finalize();

        ctx.body = archive;
      }
      else {
        ctx.body = fs.createReadStream(filePath);
      }

      ctx.attachment(fileName);
    } catch(err) {
      ctx.status = 500;
      ctx.body = err.message;
    }
  }

  async upload(ctx, next)
  {
    let {project: projectName, parentPath} = ctx.request.query;
    let project = this.core.projects[projectName];

    if(!project) {
      ctx.status = 400;
      ctx.body = `Project "${projectName}" does not exist.`;
      return;
    }

    let parentFolder = project.fileManager.getFolder(parentPath);

    if(parentFolder == undefined) {
      ctx.status = 400;
      ctx.body = `${parentPath} is not a folder.`;
      return;
    }

    let filecount = ctx.request.files.length;
    let errors = 0;

    for(let file of ctx.request.files) {
      try {
        await this.uploadFile(project.fileManager, parentFolder, file.filename, file)
      } catch(err) {
        errors++;
      }
    }

    let completed = filecount - errors;

    ctx.body =
      `${completed}/${filecount} File(s) uploaded\n` +
      `${errors} errors.`;
  }

  async uploadFile(fileManager, parentFolder, filename, readStream)
  {
    let fileNode = await fileManager.createNode(parentFolder.clientPath, filename, true);

    let writeStream = fs.createWriteStream(fileNode.serverPath);
    readStream.pipe(writeStream);
  }
}
