"use strict";

const Session = require('./Session');
const Project = require('./Project');
const fs = require("fs");

const DEFAULT_PROJECT_NAME = "new";

class Core
{
  constructor()
  {
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

    let filenames = fs.readdirSync("projects");

    for(let file of filenames)
    {
      let filePath = `projects/${file}`;

      // file is a directory
      if(fs.lstatSync(filePath).isDirectory())
        this.addProject(file);
    }

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

  deleteProject(name)
  {
    delete this.projects[name];

    this.broadcast({
      type: "project",
      action: "remove",
      name: name
    });

    if(--this.projectCount == 0)
    {
      let newProject = this.addProject(DEFAULT_PROJECT_NAME);

      for(let session of this.sessions)
        session.setProject(newProject);
    }
  }

  // accept all websocket requests
  request(request)
  {
    request.accept();
  }

  // create a session for any new connection
  connect(webSocketConnection)
  {
    let session = new Session(this, webSocketConnection, this.topId++);

    for(let projectName in this.projects)
    {
      if(session.project == undefined)
      {
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
    for(let hookList of this.sessionHooks)
    {
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

  broadcast(message)
  {
    for(let session of this.sessions)
      session.send(message);
  }

  createEditor(project, fileNode)
  {
    let lowestSupportLevel = Infinity;
    let supportedEditor;

    // search for an editor that supports this file
    for(let editorPlugin of this.editorPlugins)
    {
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

  messageReceived(session, message)
  {
    if(message.type != "project")
      return;

    switch(message.action)
    {
    case "swap":
      let project = this.projects[message.name];

      session.setProject(project);
      break;
    case "add":
      try
      {
        // create the project
        this.addProject(message.name);
      }
      catch(err)
      {
        session.displayPopup(err);
      }
      break;
    }
  }
}

module.exports = Core;