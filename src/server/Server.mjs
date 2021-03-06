import Core from "./Core";
import User from "./User";
import Koa from "koa";
import koaCompress from "koa-compress";
import koaConditionalGet from "koa-conditional-get";
import websockify from "koa-websocket";
import koaMount from "koa-mount";
import serve from "koa-static";
import koaSession from "koa-session";
import koaBody from "koa-body";
import busboy from "koa-busboy";
import logger from "koa-morgan";
import walkSync from "walk-sync";
import http from "http";
import https from "https";
import crypto from "crypto";
import path from "path";

import authenticate from "./Web/Authenticate";
import generateIndexMiddleware from "./Web/Index";
import generateEntryScriptMiddleware from "./Web/EntryScript";
import logout from "./Web/Logout";

export default class Server
{
  constructor(options)
  {
    this.options = options;
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
    // search for package.json files in the plugins folder
    let packagePaths = walkSync("plugins", { globs: ["*/package.json"] });

    for(let packagePath of packagePaths) {
      packagePath = `plugins/${packagePath}`;

      // internal path of the plugin folder
      let internalPath = path.dirname(packagePath);

      await this.loadPlugin(internalPath);
    }
  }

  async loadPlugin(internalPath)
  {
    let absolutePath = path.resolve(internalPath);

    // get the plugin class
    let {default: Plugin} = await import(absolutePath);

    // initialize the plugin
    let plugin = new Plugin(this.core, internalPath);

    // append editors to a list
    if(plugin.editors)
      this.core.editorPlugins.push(...plugin.editors);

    // pass hooks to core for core to hook to sessions later
    if(plugin.sessionHooks)
      this.core.sessionHooks.push(plugin.sessionHooks);

    if(plugin.availablePermissions)
      this.core.permissionTracker.availablePermissions.push(
        ...plugin.availablePermissions
      );

    this.plugins.push(plugin);
  }

  start()
  {
    this.koaApp.keys = [crypto.randomBytes(32)];

    this.koaApp.use(logger("dev"));
    this.koaApp.use(koaConditionalGet());
    this.koaApp.use(koaCompress());

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
    let hasCertificate = this.options.key != undefined &&
                         this.options.cert != undefined;

    let createServerFunction =
      hasCertificate ?
        (requestListener) => https.createServer(this.options, requestListener) :
        (requestListener) => http.createServer(requestListener);

    let httpServer = createServerFunction(this.koaApp.callback());

    httpServer.on("error", (error) => {
      switch(error.code) {
      case "EACCES":
        error = `Port ${this.options.port} requires elevated privileges`;
        break;
      case "EADDRINUSE":
        error = `Port ${this.options.port} is already in use`;
        break;
      }

      console.error(error);
      process.exit(1);
    });

    return httpServer.listen(this.options.port);
  }

  setupWebsocketServer(httpServer)
  {
    this.koaApp.ws.use((ctx) => {
      let error = this.resolveWebsocketRequest(ctx);

      if(error)
        ctx.websocket.close(1002, error);
    });

    this.koaApp.ws.listen({server: httpServer});
  }

  // returns an error on failure, returns undefined on success
  resolveWebsocketRequest(ctx)
  {
    let username = ctx.session.username;
    let user;

    if(username === undefined)
      return "Not logged in.";

    try{
      user = new User(username);
    } catch(err) {
      return `No user with username "${username}" found.`;
    }

    if(!user.hasPermission("user"))
      return "You do not have the 'user' permission.";

    this.core.connectSession(ctx.websocket, user);
  }
}
