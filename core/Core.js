"use strict";

const Session = require('./Session');
const Project = require('./Project');
const fs = require("fs");

class Core
{
  constructor()
  {
    this.pluginHooks = [];
    this.editorPlugins = [];
    this.sessions = [];
    this.projects = {};
    this.topId = 0;

    this.loadProjects();
  }

  loadProjects()
  {
    let filenames = fs.readdirSync("projects");

    for(let file of filenames)
    {
      let filePath = `projects/${file}`;

      // file is a directory
      if(fs.lstatSync(filePath).isDirectory())
      {
        // add the project to the project array
        let project = new Project(this, file);

        this.projects[file] = project;
      }
    }

    if(this.projects.length == 0)
      throw new Error("No Projects found");
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
    let projectCount = 0;

    for(let projectName in this.projects)
    {
      if(projectCount++ == 0)
        this.projects[projectName].connect(session);

      session.send({
        type: "project",
        action: "add",
        name: projectName
      });
    }

    // attach hooks
    for(let hookList of this.pluginHooks)
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
    for(let i = 0; i < this.sessions.length; i++)
      this.sessions[i].send(message);
  }

  createEditor(fileNode)
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
    
    let editor = new supportedEditor(this, fileNode);

    return editor;
  }

  messageReceived(session, message)
  {
    if(message.type != "project")
      return;

    switch(message.action)
    {
    case "swap":
      this.projects[message.name].connect(session);
      break;
    case "add":
      if(message.name in this.projects)
      {
        session.displayPopup(`Project "${message.name}" already exists`);
        return;
      }

      if(message.name.includes("/") || message.name.includes("\\"))
      {
        session.displayPopup("Project name can not contain / or \\");
        return;
      }

      // create the project
      this.projects[message.name] = new Project(this, message.name);
      
      this.broadcast({
        type: "project",
        action: "add",
        name: message.name
      });
      break;
    }
  }
}

module.exports = Core;