import Authentication from "./Authentication";
import Core from "./Core";
import http from "http";
import Koa from "koa";
import koaConditionalGet from "koa-conditional-get";
import websockify from "koa-websocket";
import koaMount from "koa-mount";
import serve from "koa-static";
import koaSession from "koa-session";
import koaBody from "koa-body";
import busboy from "koa-busboy";
import logger from "koa-morgan";
import ejs from "ejs";
import walkSync from "walk-sync";
import fs from "fs-extra";
import path from "path";

export default class Server
{
  constructor(port)
  {
    this.port = port;
    this.koaApp = websockify(new Koa());
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
    this.koaApp.keys = ["test"];

    this.koaApp.use(logger("dev"));
    this.koaApp.use(koaConditionalGet());

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
    this.addStaticRoute("/", "web/public");
    this.addStaticRoute("/javascript/shared", "src/shared");

    let entryScript = this.generateEntryScript();

    this.addDynamicRoute("/javascript/client/Entry.js", (ctx, next) => {
      ctx.type = "text/javascript";
      ctx.body = entryScript;
    });

    this.addStaticRoute("/javascript/client", "src/client");

    for(let plugin of this.plugins) {
      plugin.addStaticRoutes(this);

      if(plugin.publicPath) {
        let publicPath = plugin.internalPath + "/" + plugin.publicPath;
        this.addStaticRoute("/" + encodeURI(publicPath), publicPath);
      }
    }
  }

  addParsers()
  {
    this.koaApp.use(koaSession(this.koaApp));
    this.koaApp.use(koaBody());
    this.koaApp.use(busboy());
  }

  addDynamicRoutes()
  {
    this.addDynamicRoute("/auth", Authentication.authenticate);
    this.addDynamicRoute("/logout", Authentication.logout);

    // test if the user is logged in before giving access to plugins/index
    this.koaApp.use(async (ctx, next) => {
      if(!ctx.session.username)
        ctx.redirect("/auth");
      else
        await next();
    });

    for(let plugin of this.plugins)
      plugin.addDynamicRoutes(this);

    // index/main page
    let index = this.generateIndex();

    this.koaApp.use(async (ctx, next) => {
      if(ctx.path == "/")
        ctx.body = index;
      else
        await next();
    });
  }

  addStaticRoute(publicPath, internalPath)
  {
    this.addDynamicRoute(publicPath, serve(internalPath));
  }

  addDynamicRoute(publicPath, middleware)
  {
    this.koaApp.use(koaMount(publicPath, middleware));
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
    let httpServer = http.createServer(this.koaApp.callback());

    httpServer.on("error", (error) => {
      switch(error.code) {
      case "EACCES":
        error = `Port ${this.port} requires elevated privileges`;
        break;
      case "EADDRINUSE":
        error = `Port ${this.port} is already in use`;
        break;
      }

      console.error(error);
      process.exit(1);
    });

    return httpServer.listen(this.port);
  }

  setupWebsocketServer(httpServer)
  {
    this.koaApp.ws.use((ctx) => this.resolveWebsocketRequest(ctx));
    this.koaApp.ws.listen({server: httpServer});
  }

  resolveWebsocketRequest(ctx)
  {
    let username = ctx.session.username;

    if(!username) {
      ctx.websocket.close(1002, "Not logged in.");
      return;
    }

    this.core.connectSession(ctx.websocket, username);
  }
}
