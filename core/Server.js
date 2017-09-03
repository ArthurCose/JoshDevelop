const Authentication = require("./Authentication")
const Core = require("./Core");
const WebSocketServer = require("websocket").server;
const express = require("express");
const expressSession = require("express-session");
const SessionStore = require("session-file-store")(expressSession);
const ejs = require("ejs");
const logger = require("morgan");
const busboy = require("connect-busboy");
const bodyParser = require('body-parser');
const walkSync = require("walk-sync");
const fs = require("fs-extra");
const path = require("path");

class Server
{
  constructor(port)
  {
    this.core = new Core(this);
    this.port = port;
    this.express = express;
    this.app = express();
    this.sessionStore = new SessionStore();
    this.plugins = this.loadPlugins();

    this.app.use(logger("dev"));
    
    // add static routes first
    // changing the order will result in slowdown 
    this.addStaticRoutes();
    this.addParsers();
    this.addDynamicRoutes();

    this.httpServer = this.app.listen(port);

    this.setupWebsocketServer();
    this.setupErrorHandlers();    
  }
  
  loadPlugins()
  {
    let plugins = [];

    // search for plug.js files in the plugins folder
    let plugLocations = walkSync("plugins", { globs: ["*/[Pp]lug.js"] });

    for(let plugLocation of plugLocations) {
      plugLocation = `plugins/${plugLocation}`;
      let internalPath = path.dirname(plugLocation);

      // get the plugin class
      let Plugin = require(`../${plugLocation}`);

      // initialize the plugin
      let plugin = new Plugin(this.core, internalPath);

      // append editors to a list
      if(plugin.editors)
        this.core.editorPlugins.splice(0, 0, ...plugin.editors);

      // pass hooks to core for core to hook to sessions later
      if(plugin.sessionHooks)
        this.core.sessionHooks.push(plugin.sessionHooks);

      plugins.push(plugin);
    }

    return plugins;
  }

  addStaticRoutes()
  {
    this.app.use(express.static("web/public"));

    for(let plugin of this.plugins) {
      let publicPath = plugin.internalPath + "/" + plugin.publicPath;

      plugin.addStaticRoutes(this.express, this.app);
      this.app.use("/" + encodeURI(publicPath), express.static(publicPath));
    }
  }

  addParsers()
  {
    this.app.use(expressSession({
      secret: "joshua",
      resave: false,
      saveUninitialized: false,
      store: this.sessionStore
    }));
    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(busboy());
  }

  addDynamicRoutes()
  {
    for(let plugin of this.plugins)
      plugin.addDynamicRoutes(this.express, this.app);

    let index = this.generateIndex();

    this.app.use("/auth", (req, res) => Authentication.respond(req, res));
    this.app.use("/logout", (req, res) => Authentication.logout(req, res));
    this.app.use("/", (req, res) => {
      if(req.session.username)
        res.send(index);
      else
        res.redirect("/auth");
    });
  }

  generateIndex()
  {
    // use sets to keep values unique
    let data = {
      scripts: new Set(),
      stylesheets: new Set()
    };

    // get main stylesheets
    let mainCSS = walkSync("web/public/stylesheets", { directories: false });
    mainCSS.forEach((value, index) => data.stylesheets.add(`stylesheets/${value}`));

    // get scripts and stylesheets required for plugins to work
    for(let plugin of this.plugins) {
      if(!plugin.publicPath)
        continue;

      let publicPath = plugin.internalPath + "/" + plugin.publicPath;

      // add dependency scripts
      if(plugin.externalScripts)
        for(let filePath of plugin.externalScripts)
          data.scripts.add(filePath);

      // add scripts
      if(plugin.localScripts)
        for(let filePath of plugin.localScripts)
          data.scripts.add(publicPath + "/" + filePath);
  
      // add dependency stylesheets
      if(plugin.externalStylesheets)
        for(let filePath of plugin.externalStylesheets)
          data.stylesheets.add(filePath);

      // add stylesheets
      if(plugin.stylesheets)
        for(let filePath of plugin.stylesheets)
          data.stylesheets.add(publicPath + "/" + filePath);
    }

    // load the index.html template
    let template = fs.readFileSync("web/views/index.html", "utf8");

    // return the rendered index
    return ejs.render(template, data);
  }

  setupWebsocketServer()
  {
    let socketServer = new WebSocketServer({
      httpServer: this.httpServer,
      maxReceivedFrameSize: 18446744073709551615,
      maxReceivedMessageSize: 18446744073709551615
    });

    socketServer.on("request", (request) => this.core.request(request));
  }

  setupErrorHandlers()
  {
    // catch 404 and forward to error handler
    this.app.use((req, res, next) => {
      let err = new Error("Not Found");
      err.status = 404;
      next(err);
    });

    // error handler
    this.app.use((err, req, res, next) => {
      res.status(err.status || 500)
         .send(err.message);
    });

    // server error
    this.httpServer.on("error", (error) => {
      if(error.syscall != "listen")
        throw error;

      let bind = typeof port == "string" ? "Pipe " + port :
                                           "Port " + port;

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
}

module.exports = Server;