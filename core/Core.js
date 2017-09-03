"use strict";

const Session = require("./Session");
const User = require("./User");
const Project = require("./Project");
const fs = require("fs");

const DEFAULT_PROJECT_NAME = "new";

class Core
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
      throw "Core.loadProjects() can not be called more than once";

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
      throw `Project name can not be blank`;
    if(name in this.projects)
      throw `Project "${name}" already exists`;
    if(name.includes("/") || name.includes("\\"))
      throw `Project name can not contain / or \\`;

    let project = new Project(this, name);

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

  // accept all websocket requests
  request(request)
  {
    let sid;

    for(let cookie of request.cookies)
      if(cookie.name == "connect.sid")
        sid = cookie.value.slice(2).split(".")[0];

    this.server.sessionStore.get(sid, (err, sessionData) => {
      if(!sessionData.username)
        return;

      let webSocketConnection = request.accept();
      this.connect(webSocketConnection, sessionData.username);
    });
  }

  // create a session for any new connection
  connect(webSocketConnection, username)
  {
    let user = new User(username);
    let session = new Session(this, webSocketConnection, user, this.topId++);

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
        session.displayPopup(err);
      }
      break;
    }
  }
}

module.exports = Core;