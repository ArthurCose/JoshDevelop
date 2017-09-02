const Authentication = require("./core/Authentication")
const Core = require("./core/Core");
const WebSocketServer = require("websocket").server;
const express = require("express");
const expressSession = require("express-session");
const SessionStore = require("session-file-store")(expressSession);
const ejs = require("ejs");
const logger = require("morgan");
const busboy = require("connect-busboy");
const bodyParser = require('body-parser');
const walkSync = require("walk-sync");
const path = require("path");

const port = parseInt(process.argv[2] || "8080");

const core = new Core(new SessionStore());

init();

function init() {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(busboy());
  app.use(expressSession({ secret: "joshua", resave: false, saveUninitialized: false, store: core.sessionStore }));
  app.use(logger("dev"));

  let [scripts, stylesheets] = loadPlugins(app);

  let mainCSS = walkSync("web/public/stylesheets", { directories: false });
  mainCSS.forEach((value, index) => mainCSS[index] = `stylesheets/${value}`);

  stylesheets = mainCSS.concat(stylesheets);

  ejs.renderFile(
    "web/views/index.html",
    {
      scripts: scripts,
      stylesheets: stylesheets
    },
    (err, html) => createServer(app, html)
  );
}

function loadPlugins(app) {
  // search for plug.js files in the plugins folder
  let plugLocations = walkSync("plugins", { globs: ["*/[Pp]lug.js"] });

  // use sets to keep values unique
  let scripts = new Set();
  let stylesheets = new Set();

  for(let plugLocation of plugLocations) {
    plugLocation = `plugins/${plugLocation}`;
    let pluginFolder = path.dirname(plugLocation);

    let Plugin = require(`./${plugLocation}`);

    let plug = new Plugin(core);

    // append editors to a list
    if(plug.editors)
      core.editorPlugins.splice(0, 0, ...plug.editors);

    if(plug.sessionHooks)
      core.sessionHooks.push(plug.sessionHooks);

    if(plug.extraRouting)
      plug.extraRouting(express, app);

    if(plug.externalStylesheets)
      for(let filePath of plug.externalStylesheets)
        stylesheets.add(filePath);

    // add dependency scripts before any other web content
    if(plug.externalScripts)
      for(let filePath of plug.externalScripts)
        scripts.add(filePath);

    if(plug.publicPath) {
      let publicPath = pluginFolder + "/" + plug.publicPath;

      // route url
      app.use("/" + encodeURI(publicPath), express.static(publicPath));

      // add web content
      if(plug.localScripts)
        for(let filePath of plug.localScripts)
          scripts.add(publicPath + "/" + filePath);

      if(plug.stylesheets)
        for(let filePath of plug.stylesheets)
          stylesheets.add(publicPath + "/" + filePath);
    }
  }

  // convert back to arrays for other functions to handle easily
  return [Array.from(scripts), Array.from(stylesheets)];
}

function createServer(app, indexHTML) {
  app.use(express.static("web/public"));
  app.use("/auth", (req, res) => Authentication.respond(req, res));
  app.use("/logout", (req, res) => Authentication.logout(req, res));
  app.use("/", (req, res) => {
    if(req.session.username)
      res.send(indexHTML);
    else
      res.redirect("/auth");
  });

  let server = app.listen(port);

  setupWebsocketServer(server);
  setupErrorHandlers(app, server);
}

function setupWebsocketServer(server) {
  let socketServer = new WebSocketServer({
    httpServer: server,
    maxReceivedFrameSize: 18446744073709551615,
    maxReceivedMessageSize: 18446744073709551615
  });

  socketServer.on("request", (request) => core.request(request));
}

function setupErrorHandlers(app, server) {
  // catch 404 and forward to error handler
  app.use(function (req, res, next) {
    let err = new Error("Not Found");
    err.status = 404;
    next(err);
  });

  // error handler
  app.use(function (err, req, res, next) {
    res.status(err.status || 500)
      .send(err.message);
  });

  // server error
  server.on("error", function (error) {
    if(error.syscall != "listen")
      throw error;

    let bind = typeof port == "string" ? "Pipe " + port
      : "Port " + port;

    switch(error.code) {
      case "EACCES":
        console.error(bind + " requires elevated privileges");
        break;
      case "EADDRINUSE":
        console.error(bind + " is already in use");
        break;
      default:
        throw error;
    }

    process.exit(1);
  });
}