const Core = require("./core/Core");
const WebSocketServer = require('websocket').server;
const express = require('express');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const logger = require('morgan');
const busboy = require('connect-busboy');
const archiver = require("archiver");
const walkSync = require('walk-sync');
const path = require('path');
const fs = require('fs');

const port = parseInt(process.argv[2] || '8080');

const core = new Core();

init();

function init()
{
  const app = express();
  app.use(busboy());
  app.use(cookieParser());
  app.use(logger('dev'));
  
  let [javascripts, stylesheets] = loadPlugins(app);

  let mainCSS = walkSync("web/public/stylesheets", { directories: false });
  mainCSS.forEach((value, index) => mainCSS[index] = `stylesheets/${value}`);

  stylesheets = mainCSS.concat(stylesheets);

  ejs.renderFile(
    "web/views/index.html",
    {
      javascripts: javascripts,
      stylesheets: stylesheets
    },
    (err, html) => createServer(app, html)
  );
}

function loadPlugins(app)
{
  // search for plug.js files in the plugins folder
  let plugLocations = walkSync("plugins", {globs: ["*/[Pp]lug.js"]});

  // use sets to keep values unique
  let javascripts = new Set();
  let stylesheets = new Set();

  for(let plugLocation of plugLocations)
  {
    plugLocation = `plugins/${plugLocation}`;
    let plugin = require(`./${plugLocation}`);
    let pluginFolder = path.dirname(plugLocation);

    if(plugin.initialize)
      plugin.initialize(core);

    // append editors to a list
    if(plugin.editors)
      core.editorPlugins.splice(0, 0, ...plugin.editors);
    
    if(plugin.sessionHooks)
      core.sessionHooks.push(plugin.sessionHooks);
    
    if(plugin.extraRouting)
      plugin.extraRouting(express, app);

    if(plugin.externalStylesheets)
      for(let filePath of plugin.externalStylesheets)
        stylesheets.add(filePath);

    // add dependency scripts before any other web content
    if(plugin.externalScripts)
      for(let filePath of plugin.externalScripts)
        javascripts.add(filePath);
    
    if(plugin.publicPath)
    {
      let publicPath = pluginFolder + '/' + plugin.publicPath;

      // route url
      app.use('/' + encodeURI(publicPath), express.static(publicPath));
      
      // add web content
      if(plugin.localScripts)
        for(let filePath of plugin.localScripts)
          javascripts.add(publicPath + '/' + filePath);
      
      if(plugin.stylesheets)
        for(let filePath of plugin.stylesheets)
          stylesheets.add(publicPath + '/' + filePath);
    }
  }

  // convert back to arrays for other functions to handle easily
  return [Array.from(javascripts), Array.from(stylesheets)];
}

function createServer(app, indexHTML)
{
  app.use(express.static('web/public'));
  app.get('/download', (req, res) => download(req, res));
  app.post('/upload', (req, res) => upload(req, res));
  app.use('/', (req, res) => res.send(indexHTML).end());
  let server = app.listen(port);
  
  setupWebsocketServer(server);
  setupErrorHandlers(app, server);
}

function setupWebsocketServer(server)
{
  let socketServer = new WebSocketServer({
    httpServer : server,
    maxReceivedFrameSize: 18446744073709551615,
    maxReceivedMessageSize: 18446744073709551615
  });

  socketServer.on('request', (request) => core.request(request));
  socketServer.on('connect', (connection) => core.connect(connection));
}

function setupErrorHandlers(app, server)
{
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function(err, req, res, next) {
    res.status(err.status || 500)
       .send(err.message);
  });

  // server error
  server.on('error', function(error) {
    if (error.syscall != 'listen') 
      throw error;

    let bind = typeof port == 'string' ? 'Pipe ' + port
                                       : 'Port ' + port;

    switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      break;
    default:
      throw error;
    }

    process.exit(1);
  });
}

function download(req, res)
{
  let invalidProject = typeof req.query.project == "undefined" ||
                       req.query.project.includes("/") ||
                       req.query.project.includes("\\");
  let invalidPath = typeof req.query.path == 'undefined';

  if(invalidProject || invalidPath)
  {
    res.status(400).end();
    return;
  }
  
  let filePath = `projects/${req.query.project}/${req.query.path}`;
  
  fs.stat(filePath, (err, stats) => {
    if(err)
    {
      res.status(500).send(err);
      return;
    }

    if(stats.isDirectory())
    {
      let archive = archiver.create("zip");
      archive.pipe(res);
      archive.directory(filePath);
      archive.finalize();
    }
    else
    {
      res.download(filePath);
    }
  });
}

function upload(req, res)
{
  let parentPath = req.query.parentPath;
  let projectName = req.query.project;
  let project = core.projects[projectName];

  if(!project)
  {
    res.status(400).send(`Project "${projectName}" does not exist.`);
    return;
  }

  if(req.busboy == undefined)
  {
    res.status(500).send(`Busboy is missing.`);
    return;
  }
  
  let parentFolder = project.fileManager.getFolder(parentPath);

  if(parentFolder == undefined)
  {
    res.status(400).send(`${parentPath} is not a folder.`);
    return;
  }

  let errors = 0;
  let filecount = 0;

  req.busboy.on('file', (fieldname, filestream, filename, encoding, mimetype) => {
    try{
      uploadFile(project.fileManager, parentFolder, filename, filestream);
    }
    catch(err)
    {
      errors++;
      filestream.resume();
    }

    filecount++;
  });

  req.busboy.on('finish', function() {
    let completed = filecount - errors;

    res.send(
      `${completed}/${filecount} File(s) uploaded\n` +
      `(${errors}) errors.`
    );
  });

  req.pipe(req.busboy);
}

async function uploadFile(fileManager, parentFolder, filename, readStream)
{
  fileManager.createNode(parentFolder.clientPath, filename, true);

  let filePath = parentFolder.clientPath + "/" + filename;
  let fileNode = fileManager.getFile(filePath);

  if(fileNode == undefined)
    throw "Couldn't get file by path";

  let writeStream = fs.createWriteStream(fileNode.serverPath);
  readStream.pipe(writeStream);
}