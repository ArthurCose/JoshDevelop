const Shell = require("./Shell");
const Plugin = require("../../core/Plugin");

class TerminalPlugin extends Plugin
{
  constructor()
  {
    super();
    this.publicPath = "public";

    this.localScripts = ["init.js", "settings.js", "shell.js"];
    this.stylesheets = ["terminal.css", "editor.css"];

    this.externalStylesheets = ["xterm/xterm.css"];
    this.externalScripts = ["xterm/xterm.js", "xterm/addons/fit/fit.js"];

    this.extraRouting = (express, app) => {
      app.use('/xterm', express.static('node_modules/xterm/dist'));
    };

    this.hooks = {
      connect: (session) => {
        session.shells = [];
      },
      message: (session, message) => {
        if(message.type != "shell")
          return;
        
        if(message.action == "create")
        {
          let shell = new Shell(session, session.shells.length);
          session.shells.push(shell);
        }
        else
        {
          session.shells[message.id].messageReceived(message);
        }
      }
    }
  }
}

module.exports = process.env.DISABLE_SHELL ? {} : new TerminalPlugin();