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
  mainCSS.forEach((value, index) => mainCSS[index] = "stylesheets/" + value);

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
    plugLocation = "plugins/" + plugLocation;
    let plugin = require('./' + plugLocation);
    let pluginFolder = path.dirname(plugLocation);

    // append editors to a list
    if(plugin.editors)
      core.editorPlugins.splice(0, 0, ...plugin.editors);
    
    if(plugin.hooks)
      core.pluginHooks.push(plugin.hooks);
    
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
  var socketServer = new WebSocketServer({
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
    var err = new Error('Not Found');
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

    var bind = typeof port == 'string' ? 'Pipe ' + port
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
  if(typeof req.query.path == 'undefined')
  {
    res.end();
    return;
  }
  
  var filePath = req.query.path == '' ? '/' : req.query.path;
  filePath = "project/" + path.resolve(filePath);
  
  fs.stat(filePath, (err, stats) => {
    if(err)
      return;

    if(stats.isDirectory())
    {
      var archive = archiver.create("zip");
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
  var parentPath = req.query.parentPath;
  var parentFolder = core.fileManager.getFolder(parentPath);

  if(req.busboy == undefined)
    return;

  if(parentFolder == undefined)
  {
    res.send(`${parentPath} is not a folder.`);
    return;
  }

  var errors = 0;
  var filecount = 0;

  req.busboy.on('file', (fieldname, filestream, filename, encoding, mimetype) => {
    var error = uploadFile(parentFolder, filename, filestream);
    filecount++;
    
    if(error)
    {
      errors++;
      filestream.resume();
    }
  });

  req.busboy.on('finish', function() {
    var completed = filecount - errors;

    res.send(
      `${completed}/${filecount} File(s) uploaded\n` +
      `(${errors}) errors.`
    );
  });

  req.pipe(req.busboy);
}

function uploadFile(parentFolder, filename, readStream)
{
  var creationError = core.fileManager.createNode(
    parentFolder.clientPath,
    filename,
    true
  );

  // skip if there's an error
  if(creationError)
    return creationError;

  var filePath = parentFolder.clientPath + "/" + filename;
  var fileNode = core.fileManager.getFile(filePath);

  if(fileNode == undefined)
    return "Couldn't get file by path";

  var writeStream = fs.createWriteStream(fileNode.serverPath);
  readStream.pipe(writeStream);
}