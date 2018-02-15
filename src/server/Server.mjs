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
import walkSync from "walk-sync";
import path from "path";

import authenticate from "./Web/Authenticate";
import generateIndexMiddleware from "./Web/Index";
import generateEntryScriptMiddleware from "./Web/EntryScript";
import logout from "./Web/Logout";

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

    this.addDynamicRoute("/javascript/client/Entry.js", generateEntryScriptMiddleware(this));

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
    this.addDynamicRoute("/auth", authenticate);
    this.addDynamicRoute("/logout", logout);

    // test if the user is logged in before giving access to plugins/index
    this.koaApp.use(async (ctx, next) => {
      if(!ctx.session.username)
        ctx.redirect("/auth");
      else
        await next();
    });

    for(let plugin of this.plugins)
      plugin.addDynamicRoutes(this);

    this.koaApp.use(generateIndexMiddleware(this));
  }

  addStaticRoute(publicPath, internalPath)
  {
    this.addDynamicRoute(publicPath, serve(internalPath));
  }

  addDynamicRoute(publicPath, middleware)
  {
    this.koaApp.use(koaMount(publicPath, middleware));
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
