"use strict";

const pty = require('node-pty');

class Shell
{
  constructor(session, id)
  {
    this.session = session;
    this.columns = 80;
    this.rows = 30;
    this.id = id;

    this.term = this.createTerminal();
    
    this.session.send({
      type: "shell",
      id: this.id,
      action: "getsize"
    });

    this.session.on("disconnect", () => {
      this.destroy();
    });
  }

  messageReceived(message)
  {
    if(!this.term)
      return;

    switch(message.action)
    {
    case "destroy":
      this.destroy();
      break;
    case "input":
      this.term.write(message.value);
      break;
    case "terminate":
      this.term.process.kill();
      break;
    case "resize":
      this.columns = message.size.columns;
      this.rows = message.size.rows;

      this.term.resize(this.columns, this.rows);
      break;
    }
  }
  
  print(message)
  {
    this.session.send({
      type: "shell",
      action: "output",
      id: this.id,
      value: message
    });
  }
  
  createTerminal()
  {
    let term = pty.spawn(
      process.env.SHELL,
      [],
      {
        name: "xterm-color",
        cols: this.columns,
        rows: this.rows,
        cwd: this.session.fileManager.root.serverPath,
        env: process.env
      }
    );

    // send continuous output
    term.on("data", (data) => this.print(data));
    term.on("error", (error) => console.log(error));

    return term;
  }

  destroy()
  {
    if(this.term)
      this.term.kill();
    
    this.session.shells[this.id] = undefined;
  }
}

module.exports = Shell;