Terminal.applyAddon(fit);

export default class Shell
{
  constructor(tab, element, session, id)
  {
    this.id = id;
    this.element = element;
    this.session = session;
    this.terminal = new Terminal();
    this.terminal.open(element);
    this.tab = tab;

    // close when the tab is closed
    tab.on("close", () => this.destroy());
    tab.on("resize", (eventName) => this.resized());

    // notify server of creation
    session.send({
      type: "shell",
      action: "create"
    });

    // handle input
    this.terminal.on("data", (input) => input(input));

    /*this.terminal.on("title", (title) => {
      tab.name = title;
    });*/
  }

  input(input)
  {
    this.session.send({
      type: "shell",
      action: "input",
      id: this.id,
      value: input
    });
  }

  resized()
  {
    this.terminal.fit();

    this.session.send({
      type: "shell",
      action: "resize",
      id: this.id,
      size: {
        columns: this.terminal.cols,
        rows: this.terminal.rows
      }
    });
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "output":
      this.terminal.write(message.value);
      break;
    case "getsize":
      this.resized();
      break;
    case "close":
      this.tab.destroy();
      break;
    }
  }

  destroy()
  {
    this.session.send({
      type: "shell",
      action: "destroy",
      id: this.id
    });
  }
}