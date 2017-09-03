const Plugin = require("../../core/Plugin");
const Shell = require("./Shell");

class TerminalPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";

    this.localScripts = ["init.js", "shell.js"];
    this.stylesheets = ["terminal.css", "editor.css"];

    this.externalStylesheets = ["xterm/xterm.css"];
    this.externalScripts = ["xterm/xterm.js", "xterm/addons/fit/fit.js"];

    this.sessionHooks = {
      connect: (session) => {
        session.shells = [];
      },
      message: (session, message) => {
        if(message.type != "shell")
          return;
        
        if(message.action == "create") {
          let shell = new Shell(session, session.shells.length);
          session.shells.push(shell);
        }
        else {
          session.shells[message.id].messageReceived(message);
        }
      }
    }
  }

  addStaticRoutes(express, app)
  {
    app.use("/xterm", express.static("node_modules/xterm/dist"));
  }
}

module.exports = TerminalPlugin;