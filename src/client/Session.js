import MainContainer from "./MainContainer.js";
import ClientFileManager from "./FileManagement/ClientFileManager.js"
import PermissionManager from "./PermissionManager.js";
import ProjectListMenu from "./ProjectListMenu.js";
import { SettingsMenu } from "./Settings.js";
import { TabbedContainer } from "./Tabs.js";
import Toolbar from "./Toolbar.js";
import UserList from "./UserList.js";
import {VSplit} from "./Splitter.js";
import EventRaiser from "../shared/EventRaiser.mjs";

export default class Session extends EventRaiser
{
  constructor()
  {
    super();
    this.id = -1;
    this.websocket = undefined;
    this.profile = undefined;
    this.project = undefined;
    // <name, class>
    this.editorDictionary = new Map();
    this.editors = new Map();
    this.editorWaitingList = new Map();
    this.mainContainer = new MainContainer("#main-container", this);
    this.toolbar = new Toolbar();
    this.userList = new UserList(this);
    this.settingsMenu = new SettingsMenu(this);
    this.fileManager = this.initializeFileManager();
    this.projectList = new ProjectListMenu(this);
    this.permissionManager = undefined;

    this.initializeSplitters();

    this.addEvent("connect");
    this.addEvent("message");
  }

  initializeFileManager()
  {
    let clientFileManager = new ClientFileManager(this);

    clientFileManager.on("click", (node) => {
      if(node.isFile)
        this.openEditor(node.clientPath);
    });

    return clientFileManager;
  }

  initializeSplitters()
  {
    let vsplit = new VSplit(
      this.fileManager.element,
      this.mainContainer.element
    );

    vsplit.on("resize", () => this.mainContainer.resized());
    window.addEventListener("resize", () => this.mainContainer.resized());
  }

  openEditor(path, focus = true)
  {
    // get the tab for the editor
    let tab = this.mainContainer.getTab(path);

    // if the tab already exists, then make it active
    if(tab) {
      if(focus)
        tab.makeActive();
      return;
    }

    if(this.editorWaitingList.get(path))
      return;

    // request to join an editor session
    this.send({
      type: "editor",
      action: "join",
      path,
      focus
    });

    this.editorWaitingList.set(path, true);
  }

  initializeEditor(editorName, path, id, focus)
  {
    // get the class/constructor from the editor dictionary
    let EditorClass = this.editorDictionary.get(editorName);
    // get the file node for the editor
    let fileNode = this.fileManager.getFile(path);
    // create an element for the editor to use
    let element = document.createElement("div");
    element.className = "editor";

    // create tab
    let tab = this.mainContainer.addTab(fileNode.clientPath, fileNode.name, element);

    this.editors.set(id, new EditorClass(id, fileNode, tab, this));
    this.editorWaitingList.delete(path);

    if(focus)
      tab.makeActive();
  }

  displayPopup(message)
  {
    let popup = document.createElement("div");
    popup.className = "popup";
    popup.innerText = message;

    popup.style.transition = "opacity 300ms, margin 500ms";
    popup.style.opacity = 1;

    popup.addEventListener("click", (e) => {
      popup.style.pointerEvents = "none";
      popup.style.opacity = 0;
      popup.style.marginTop = -popup.clientHeight - 20 + "px";
      setTimeout(() => popup.remove(), 500);
    });

    let container = document.getElementById("popup-container");

    container.appendChild(popup);
  }

  connect()
  {
    let usingHttps = window.location.protocol == "https:";
    let protocol = usingHttps ? "wss://" : "ws://";
    let url = protocol + window.location.host;

    this.websocket = new WebSocket(url);

    this.websocket.onopen = (e) => {
      document.getElementById("connection").style.backgroundColor = "lime";
    };

    this.websocket.onclose = (e) => {
      this.displayPopup(`Disconnected from the server:\n${e.reason}`);
      document.getElementById("connection").style.backgroundColor = "red";
    };

    this.websocket.onmessage = (e) => this.messageReceived(e.data);

    this.websocket.onerror = (e) => console.error(e.data);
  }

  swapProject(projectName)
  {
    // close all editors
    for(let [id, editor] of this.editors)
      editor.tab.destroy();

    // reset the file tree
    this.fileManager.reset();

    this.send({
      type: "project",
      action: "swap",
      name: projectName
    });
  }

  setProject(projectName)
  {
    this.fileManager.root.name = projectName;
    this.fileManager.clipboard.empty();
    this.project = projectName;
  }

  enableAdminTools()
  {
    this.permissionManager = new PermissionManager(this);

    this.settingsMenu.addSection(
      this.permissionManager
    );
  }

  messageReceived(message)
  {
    message = JSON.parse(message);

    switch(message.type) {
    case "init":
      this.id = message.id;
      this.settings = message.settings;
      this.permissions = message.permissions;
      this.mainContainer.loadLayout(message.layout);

      if(this.permissions.includes("admin"))
        this.enableAdminTools();

      this.triggerEvent("connect");
      break;
    case "popup":
      this.displayPopup(message.message);
      break;
    case "filetree":
      this.fileManager.messageReceived(message);
      break;
    case "project":
      this.projectList.messageReceived(message);
      break;
    case "profile":
      this.userList.messageReceived(message);
      break;
    case "editor":
      if(message.action == "initialize") {
        this.initializeEditor(
          message.name,
          message.path,
          message.id,
          message.focus
        );
        break;
      }

      let editor = this.editors.get(message.editorId);

      if(editor)
        editor.messageReceived(message);
      break;
    case "permissions":
      this.permissionManager.messageReceived(message);
      break;
    }

    this.triggerEvent("message", message);
  }

  send(message)
  {
    message = JSON.stringify(message);
    this.websocket.send(message);
  }
}
