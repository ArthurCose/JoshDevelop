import EventRaiser from "../shared/EventRaiser";

export default class Session extends EventRaiser
{
  constructor(id, user, websocket, core)
  {
    super();
    this.id = id;
    this.user = user;
    this.websocket = websocket;
    this.core = core;

    this.project = undefined;
    this.idToEditor = new Map();
    this.editorToId = new Map();
    this.editorIdCount = 0;
    this.location = "";

    this.socketReady = true;
    this.messageQueue = [];

    this.websocket.on("message", (message) => this.messageReceived(message));
    this.websocket.on("close", () => this.disconnected());

    this.addEvent("message");
    this.addEvent("join project");
    this.addEvent("leave project");
    this.addEvent("disconnect");
  }

  init()
  {
    // send the user to a project
    let projectName = this.user.get("project");
    let project = this.core.projects.get(projectName);
    let layout = this.user.get("layout");

    if(!project) {
      project = this.core.getDefaultProject();
      layout = undefined;
    }

    this.setProject(project);

    // give the client their ID
    this.send({
      type: "init",
      id: this.id,
      settings: this.user.get("settings"),
      permissions: this.user.get("permissions"),
      layout
    });

    // broadcast the addition of this
    // user to update user lists
    this.core.broadcast({
      type: "profile",
      action: "add",
      name: this.user.get("nickname"),
      color: this.user.get("color"),
      location: "",
      sessionID: this.id
    });

    // send session list to this session
    // ignore self as it was received through broadcasted already
    for(let session of this.core.sessions)
      if(session != this)
        this.send({
          type: "profile",
          action: "add",
          name: session.user.get("nickname"),
          color: session.user.get("color"),
          location: session.location,
          sessionID: session.id
        });
  }

  setProject(project)
  {
    let lastProject = this.project;

    this.project = project;

    this.user.set("project", project.name);
    this.user.save();

    this.send({
      type: "project",
      action: "swap",
      name: project.name
    });

    if(lastProject != undefined) {
      lastProject.disconnect(this);
      this.triggerEvent("leave project", lastProject);
    }

    project.connect(this);
    this.triggerEvent("join project", project);
  }

  get fileManager()
  {
    return this.project.fileManager;
  }

  openEditor(path, focus = true)
  {
    let editor = this.project.getEditor(path);

    if(!editor) {
      this.displayPopup(`No editor available for ${path}`);
      return;
    }

    let id = this.editorIdCount++;

    this.send({
      type: "editor",
      action: "initialize",
      name: editor.name,
      path,
      focus,
      id
    });

    this.idToEditor.set(id, editor);
    this.editorToId.set(editor, id);

    return editor;
  }

  send(message)
  {
    message = JSON.stringify(message);

    this.messageQueue.push(message);

    if(this.socketReady)
      this.dequeueMessages();
  }

  dequeueMessages()
  {
    if(this.websocket.readyState != 1)
      return;

    let message = this.messageQueue.shift();

    this.socketReady = false;

    this.websocket.send(message, () => {
      this.socketReady = true;

      if(this.messageQueue.length > 0)
        this.dequeueMessages();
    });
  }

  displayPopup(message)
  {
    message = {
      type: "popup",
      message: message
    };

    this.send(message);
  }

  messageReceived(message)
  {
    try {
      message = JSON.parse(message);

      switch(message.type) {
      case "editor":
        let editor = this.idToEditor.get(message.editorId) ||
                     this.openEditor(message.path, message.focus);

        if(editor)
          editor.messageReceived(this, message);
        break;
      case "filemanager":
        this.fileManager.messageReceived(this, message)
                        .catch((err) => this.displayPopup(err.message));
        break;
      case "project":
        this.core.messageReceived(this, message);
        break;
      case "settings":
        let settings = this.user.get("settings");
        settings[message.section] = message.data;
        this.user.set("settings", settings);
        this.user.save();
        break;
      case "permissions":
        this.core.permissionTracker.messageReceived(this, message);
        break;
      case "profile":
        if(message.action != "update")
          return;

        this.user.set("nickname", message.name);
        this.user.set("color", message.color);
        this.user.save();

        this.core.broadcast({
          type: "profile",
          action: "update",
          name: message.name,
          color: message.color,
          sessionID: this.id
        });
        break;
      case "location":
        this.location = message.location;

        this.core.broadcast({
          type: "profile",
          action: "update",
          location: this.location,
          sessionID: this.id
        });
        break;
      case "layout":
        this.user.set("layout", message.layout);
        this.user.save();
        break;
      }

      this.triggerEvent("message", message);
    }
    catch(err)
    {
      console.log(message);
      console.log("\n");
      console.log(err);
      // some error that could've crashed the server
      // I'm assuming it wasn't me, and was someone trying
      // to be malicious
    }
  }

  closeOpenedEditors()
  {
    for(let [id, editor] of this.idToEditor)
      editor.removeSession(this);
  }

  disconnected()
  {
    this.closeOpenedEditors();

    let index = this.core.sessions.indexOf(this);
    this.core.sessions.splice(index, 1);

    this.core.broadcast({
      type: "profile",
      action: "remove",
      sessionID: this.id
    });

    this.triggerEvent("disconnect");
  }
}
