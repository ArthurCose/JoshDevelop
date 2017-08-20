class Session extends EventRaiser
{
  constructor()
  {
    super();
    this.project = undefined;
    this.cookiejar = new CookieJar();

    // name -> class
    this.editorDictionary = {};

    this.addEvent("connect");
    this.addEvent("load");
    this.addEvent("message");
  }

  windowLoaded()
  {
    this.toolbar = new Toolbar();
    this.userlist = new UserList();
    this.settings = new SettingsMenu();
    this.fileManager = this.initializeFileManager();
    this.projectList = this.initializeProjectList();

    let editorContainer = document.querySelector("#editor-container");

    this.editorTabs = new TabbedContainer(editorContainer);

    this.websocket = this.connect(() => {
      this.editors = [];
      this.id = -1;
      
      this.triggerEvent("connect");
    });

    this.initializeSplitters();

    this.triggerEvent("load");
  }
  
  initializeSplitters()
  {
    let vsplit = new VSplit(
      session.fileManager.container,
      session.editorTabs.container
    );
    
    vsplit.on("resize", () => session.editorTabs.resized());
    window.addEventListener("resize", () => session.editorTabs.resized());
  }

  initializeFileManager()
  {
    let element = document.querySelector("#filetree");
    let fileManager = new ClientFileManager(element);

    fileManager.addListener((node) => {
      if(!node.isFile)
        return;

      this.openEditor(node);
    });

    return fileManager;
  }

  initializeProjectList()
  {
    let dropdown = this.toolbar.addDropDown("Projects");

    dropdown.addBreak("/list end");
    dropdown.addButton("New Project", () => {
      let menuElement = dropdown.contextMenu.element;
      let breakElement = menuElement.querySelector("hr");
      let input = document.createElement("input");

      input.addEventListener("change", () => {
        console.log(input.value);
        dropdown.hide();
      })
      input.addEventListener("blur", () => {
        dropdown.hide();
      });

      menuElement.insertBefore(input, breakElement);
      input.focus();
    }, false);

    return dropdown;
  }

  openEditor(fileNode)
  {
    let tab = this.editorTabs.get(fileNode.clientPath);

    if(tab)
    {
      tab.makeActive();
    }
    else
    {
      // request to join an editor session
      this.send({
        type: "editor",
        action: "join",
        path: fileNode.clientPath,
        editorId: this.editors.length
      });

      // allocate a space for the editor
      // save the path of the file there so we don't
      // have to send it back and forth
      this.editors.push(fileNode.clientPath);
    }
  }

  initializeEditor(editorName, id)
  {
    let EditorClass = this.editorDictionary[editorName];
    let filePath = this.editors[id];

    let fileNode = this.fileManager.getFile(filePath);
    let element = document.createElement("div");
    element.className = "editor";

    // create tab
    let tab = this.editorTabs.addTab(fileNode.clientPath, fileNode.name, element);

    // create the editor
    this.editors[id] = new EditorClass(tab, fileNode, element, id);

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
    let websocket = new WebSocket("ws://" + window.location.host);

    websocket.onopen = (e) => {
      document.getElementById("connection").style.backgroundColor = "lime";

      if(onConnect)
        onConnect();
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

  addProject(projectName)
  {
    this.projectList.addButtonBefore(
      "/list end",
      projectName,
      () => this.swapProject(projectName)
    );
  }

  removeProject(projectName)
  {
    this.projectList.removeElement(projectName);
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
      type: "project swap",
      name: projectName
    });
  }

  setProject(projectName)
  {
    this.fileManager.root.name = projectName;
    this.project = projectName;
  }

  messageReceived(message)
  {
    message = JSON.parse(message);

    switch(message.type)
    {
    case "init":
      this.id = message.id;
      break;
    case "popup":
      this.displayPopup(message.message);
      break;
    case "editor":
      let editor = this.editors[message.editorId];
      
      editor.messageReceived(message);
      break;
    case "initialize editor":
      this.initializeEditor(message.name, message.id);
      break;
    case "filetree":
      this.fileManager.messageReceived(message);
      break;
    case "project swap":
      this.setProject(message.name);
    break;
    case "project add":
      this.addProject(message.name);
      break;
    case "project remove":
      this.removeProject(message.name);
      break;
    case "user add":
      this.userlist.addUser(message.name, message.color, message.userid);
      break;
    case "user update":
      if(message.userid == this.id)
        break;

      let user = this.userlist.getUser(message.userid);

      user.name = message.name;
      user.color = message.color;
      break;
    case "user remove":
      this.userlist.removeUser(message.userid);
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