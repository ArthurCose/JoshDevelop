import Session from "./Session";
import PermissionTracker from "./PermissionTracker";
import Project from "./Project";
import fs from "fs";

const DEFAULT_PROJECT_NAME = "new";

export default class Core
{
  constructor(server)
  {
    this.server = server;
    this.permissionTracker = new PermissionTracker(this);
    this.sessionHooks = [];
    this.editorPlugins = [];
    this.sessions = [];
    this.projects = new Map();
    this.topId = 0;

    this.loadProjects();
  }

  loadProjects()
  {
    if(this.projects.size > 0)
      throw new Error("Core.loadProjects() can not be called more than once");

    // search for projects in the projects folder
    let filenames = fs.readdirSync("projects");

    for(let file of filenames) {
      let filePath = `projects/${file}`;

      // file is a directory
      if(fs.lstatSync(filePath).isDirectory())
        this.addProject(file);
    }

    // create the default project if no projects were found
    if(this.projectCount == 0)
      this.addProject(DEFAULT_PROJECT_NAME);
  }

  getDefaultProject()
  {
    return this.projects.values().next().value;
  }

  addProject(name)
  {
    if(name == "")
      throw new Error("Project name can not be blank");
    if(this.projects.has(name))
      throw new Error(`Project "${name}" already exists`);
    if(name.includes("/") || name.includes("\\"))
      throw new Error("Project name can not contain / or \\");

    let project = new Project(name, this);

    this.projects.set(name, project);
    this.projectCount++;

    this.broadcast({
      type: "project",
      action: "add",
      name: name
    });

    return project;
  }

  removeProject(name)
  {
    this.projects.delete(name);

    // no projects, create the default project
    if(this.projects.size == 0) {
      let newProject = this.addProject(DEFAULT_PROJECT_NAME);

      for(let session of this.sessions)
        session.setProject(newProject);
    }

    this.broadcast({
      type: "project",
      action: "remove",
      name: name
    });
  }

  // create a session for any new connection
  connectSession(websocket, user)
  {
    let session = new Session(this.topId++, user, websocket, this);

    // send the project list to the session
    for(let [name, project] of this.projects) {
      session.send({
        type: "project",
        action: "add",
        name: name
      });
    }

    // attach hooks
    for(let hookList of this.sessionHooks) {
      if(hookList.connect) {
        hookList.connect(session);
      }

      if(hookList.message) {
        session.on(
          "message",
          (...args) => hookList.message(session, ...args)
        );
      }

      if(hookList.disconnect) {
        session.on(
          "disconnect",
          (...args) => hookList.disconnect(session, ...args)
        );
      }
    }

    this.sessions.push(session);
    session.init();
  }

  createEditor(project, fileNode)
  {
    let lowestSupportLevel = Infinity;
    let supportedEditor;

    // search for an editor that supports this file
    for(let editorPlugin of this.editorPlugins) {
      let supportLevel = editorPlugin.getSupportLevelFor(fileNode.name);

      // higher number means lower priority
      // 0 is no support
      if(supportLevel == 0 || supportLevel > lowestSupportLevel)
        continue;

      supportedEditor = editorPlugin;
      lowestSupportLevel = supportLevel;

      // reached the best level of support
      if(lowestSupportLevel == 1)
        break;
    }

    if(!supportedEditor)
      return;

    let editor = new supportedEditor(project, fileNode);

    return editor;
  }

  broadcast(message) {
    for(let session of this.sessions)
      session.send(message);
  }

  messageReceived(session, message) {
    if(message.type != "project")
      return;

    switch(message.action) {
    case "swap":
      let project = this.projects.get(message.name);

      session.setProject(project);
      break;
    case "add":
      try {
        // create the project
        this.addProject(message.name);
      }
      catch(err) {
        session.displayPopup(err.message);
      }
      break;
    }
  }
}
