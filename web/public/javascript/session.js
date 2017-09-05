class Session extends EventRaiser
{
  constructor()
  {
    super();
    this.id = -1;
    this.profile = undefined;
    this.project = undefined;
    this.editors = [];
    
    // <name, class>
    this.editorDictionary = {};

    this.addEvent("connect");
    this.addEvent("load");
    this.addEvent("message");
  }

  windowLoaded()
  {
    this.toolbar = new Toolbar();
    this.userList = new UserList();
    this.settingsMenu = new SettingsMenu();
    this.fileManager = this.initializeFileManager();
    this.projectList = new ProjectListMenu();
    
    this.editorTabs = new TabbedContainer("#editor-container");
    this.initializeSplitters();
    
    this.triggerEvent("load");

    this.websocket = this.connect();
  }
  
  initializeSplitters()
  {
    let vsplit = new VSplit(
      session.fileManager.element,
      session.editorTabs.element
    );
    
    vsplit.on("resize", () => session.editorTabs.resized());
    window.addEventListener("resize", () => session.editorTabs.resized());
  }

  initializeFileManager()
  {
    let fileManager = new ClientFileManager();

    fileManager.addListener((node) => {
      if(!node.isFile)
        return;

      this.openEditor(node.clientPath);
    });

    return fileManager;
  }

  openEditor(filePath)
  {
    // get the tab for the editor
    let tab = this.editorTabs.getTab(filePath);

    // if the tab already exists, then make it active
    if(tab) {
      tab.makeActive();
      return;
    }

    // tab did not exist, we need to join/create the editor session

    // request to join an editor session
    this.send({
      type: "editor",
      action: "join",
      path: filePath,
      editorId: this.editors.length
    });

    // allocate a space for the editor
    // save the path of the file there so we don't
    // have to send it back and forth
    this.editors.push(filePath);
  }

  initializeEditor(editorName, id)
  {
    // get the class/constructor from the editor dictionary
    let EditorClass = this.editorDictionary[editorName];
    // retrieve the editor place holder (its path)
    let filePath = this.editors[id];
    // get the file node for the editor
    let fileNode = this.fileManager.getFile(filePath);
    // create an element for the editor to use
    let element = document.createElement("div");
    element.className = "editor";

    // create tab
    let tab = this.editorTabs.addTab(fileNode.clientPath, fileNode.name, element);

    // create the editor
    this.editors[id] = new EditorClass(tab, fileNode, id);

    // make the newly opened editor the active editor
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

  connect(onConnect)
  {
    let websocket = new WebSocket(`ws://${window.location.host}`);

    websocket.onopen = (e) => {
      document.getElementById("connection").style.backgroundColor = "lime";
    };

    websocket.onclose = (e) => {
      this.displayPopup("Disconnected from the server");
      document.getElementById("connection").style.backgroundColor = "red";
      console.error(e);
    };

    websocket.onmessage = (e) => session.messageReceived(e.data);

    websocket.onerror = (e) => console.error(e.data);

    return websocket;
  }

  swapProject(projectName)
  {
    // close all editors
    for(let editor of this.editors)
      if(editor)
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
    this.fileManager.clipboard = new FileClipboard();
    this.project = projectName;
  }

  messageReceived(message)
  {
    message = JSON.parse(message);

    switch(message.type) {
    case "init":
      this.id = message.id;
      this.settings = message.settings;
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
        this.initializeEditor(message.name, message.id);
        break;
      }
      
      let editor = this.editors[message.editorId];
      
      editor.messageReceived(message);
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