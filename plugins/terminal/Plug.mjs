import Plugin from "../../src/server/Plugin";
import Shell from "./Shell";

export default class TerminalPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";

    this.clientEntry = "Entry.js";
    this.stylesheets = ["terminal.css", "editor.css"];

    this.externalStylesheets = ["xterm/xterm.css"];
    this.externalScripts = ["xterm/xterm.js", "xterm/addons/fit/fit.js"];

    this.availablePermissions = ["terminal"];

    this.sessionHooks = {
      connect: (session) => {
        session.shells = [];
      },
      message: (session, message) => {
        if(message.type != "shell")
          return;
        if(!session.user.hasPermission("terminal"))
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

  addStaticRoutes(server)
  {
    server.addStaticRoute(
      "/xterm",
      "plugins/terminal/node_modules/xterm/dist"
    );
  }
}
