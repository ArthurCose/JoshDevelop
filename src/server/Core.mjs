import Session from "./Session";
import User from "./User";
import Project from "./Project";
import fs from "fs";

const DEFAULT_PROJECT_NAME = "new";

export default class Core
{
  constructor(server)
  {
    this.server = server;
    this.sessionHooks = [];
    this.editorPlugins = [];
    this.sessions = [];
    this.projects = {};
    this.projectCount = 0
    this.topId = 0;

    this.loadProjects();
  }

  loadProjects()
  {
    if(this.projectCount > 0)
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

  addProject(name)
  {
    if(name == "")
      throw new Error("Project name can not be blank");
    if(name in this.projects)
      throw new Error(`Project "${name}" already exists`);
    if(name.includes("/") || name.includes("\\"))
      throw new Error("Project name can not contain / or \\");

    let project = new Project(name, this);

    this.projects[name] = project;
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
    delete this.projects[name];

    // no projects, create the default project
    if(--this.projectCount == 0) {
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
  connectSession(websocket, username)
  {
    let user = new User(username);
    let session = new Session(this.topId++, user, websocket, this);

    // send the project list to the session
    for(let projectName in this.projects) {
      // shove the session into a project if it didn't already happen
      if(session.project == undefined) {
        let project = this.projects[projectName];

        session.setProject(project);
      }

      session.send({
        type: "project",
        action: "add",
        name: projectName
      });
    }

    // attach hooks
    for(let hookList of this.sessionHooks) {
      if(hookList.connect)
        hookList.connect(session);
      if(hookList.message)
        session.on("message", hookList.message);
      if(hookList.disconnect)
        session.on("disconnect", hookList.disconnect);
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
      let project = this.projects[message.name];

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
