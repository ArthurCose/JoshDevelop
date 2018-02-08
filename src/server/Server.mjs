import Authentication from "./Authentication";
import Core from "./Core";
import http from "http";
import websocket from "websocket";
import express from "express";
import expressSession from "express-session";
import sessionFileStore from "session-file-store";
import ejs from "ejs";
import logger from "morgan";
import busboy from "connect-busboy";
import bodyParser from "body-parser";
import walkSync from "walk-sync";
import fs from "fs-extra";
import path from "path";

const WebSocketServer = websocket.server;
const SessionStore = sessionFileStore(expressSession);

export default class Server
{
  constructor(port)
  {
    this.port = port;
    this.expressApp = express();
    this.sessionStore = new SessionStore();
    this.core = new Core(this);
    this.plugins = [];

    this.loadPlugins()
        .then(() => this.start())
        .catch((err) => {
          console.error(err);
          process.exit(-1);
        });
  }

  async loadPlugins()
  {
    // search for plug.js files in the plugins folder
    let plugLocations = walkSync("plugins", { globs: ["*/[Pp]lug.mjs"] });

    for(let plugLocation of plugLocations) {
      plugLocation = `plugins/${plugLocation}`;

      let internalPath = path.dirname(plugLocation);
      let absolutePath = path.resolve(plugLocation);

      // get the plugin class
      let {default: Plugin} = await import(absolutePath);

      // initialize the plugin
      let plugin = new Plugin(this.core, internalPath);

      // append editors to a list
      if(plugin.editors)
        this.core.editorPlugins.splice(0, 0, ...plugin.editors);

      // pass hooks to core for core to hook to sessions later
      if(plugin.sessionHooks)
        this.core.sessionHooks.push(plugin.sessionHooks);

      this.plugins.push(plugin);
    }
  }

  start()
  {
    this.expressApp.use(logger("dev"));

    // add static routes first
    // changing the order will result in slowdown
    this.addStaticRoutes();
    this.addParsers();
    this.addDynamicRoutes();

    let httpServer = this.setupHttpServer();

    this.setupWebsocketServer(httpServer);
  }

  addStaticRoutes()
  {
    this.expressApp.use(express.static("web/public"));
    this.expressApp.use("/javascript/shared", express.static("src/shared"));

    let entryScript = this.generateEntryScript();

    this.expressApp.use("/javascript/client/Entry.js", (req, res) => {
      res.contentType("text/javascript")
         .send(entryScript);
    });

    this.expressApp.use("/javascript/client", express.static("src/client"));

    for(let plugin of this.plugins) {
      plugin.addStaticRoutes(express, this.expressApp);

      if(plugin.publicPath) {
        let publicPath = plugin.internalPath + "/" + plugin.publicPath;
        this.expressApp.use("/" + encodeURI(publicPath), express.static(publicPath));
      }
    }
  }

  addParsers()
  {
    this.expressApp.use(expressSession({
      secret: "joshua",
      resave: false,
      saveUninitialized: false,
      store: this.sessionStore
    }));
    this.expressApp.use(bodyParser.urlencoded({ extended: false }));
    this.expressApp.use(bodyParser.json());
    this.expressApp.use(busboy());
  }

  addDynamicRoutes()
  {
    this.expressApp.use("/auth", (req, res) => Authentication.authenticate(req, res));
    this.expressApp.use("/logout", (req, res) => Authentication.logout(req, res));

    // test if the user is logged in before giving access to plugins/index
    this.expressApp.use((req, res, next) => {
      if(!req.session.username)
        res.redirect("/auth");
      else
        next();
    });

    for(let plugin of this.plugins)
      plugin.addDynamicRoutes(this.express, this.expressApp);

    // index/main page
    let index = this.generateIndex();

    this.expressApp.use((req, res, next) => {
      if(req.path == "/")
        res.send(index);
      else
        next();
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
    let template = fs.readFileSync("web/templates/index.html", "utf8");

    // return the rendered index
    return ejs.render(template, data);
  }

  generateEntryScript()
  {
    let data = {
      entryScripts: []
    };

    for(let plugin of this.plugins) {
      if(!plugin.publicPath && !plugin.clientEntry)
        continue;

      let publicPath = `../../${plugin.internalPath}/${plugin.publicPath}`;

      data.entryScripts.push(`${publicPath}/${plugin.clientEntry}`);
    }

    // load the Entry.js template
    let template = fs.readFileSync("web/templates/javascript/Entry.js", "utf8");

    // return the rendered index
    return ejs.render(template, data);
  }

  setupHttpServer()
  {
    let httpServer = http.createServer(this.expressApp);

    httpServer.on("error", (error) => {
      if(error.syscall != "listen")
        throw error;

      switch(error.code) {
      case "EACCES":
        console.error(`Port ${this.port} requires elevated privileges`);
        break;
      case "EADDRINUSE":
        console.error(`Port ${this.port} is already in use`);
        break;
      default:
        throw error;
      }

      process.exit(1);
    });

    return httpServer.listen(this.port);
  }

  setupWebsocketServer(httpServer)
  {
    let socketServer = new WebSocketServer({
      httpServer: httpServer,
      maxReceivedFrameSize: 18446744073709551615,
      maxReceivedMessageSize: 18446744073709551615
    });

    socketServer.on("request", (request) => this.core.request(request));

    return socketServer;
  }
}
