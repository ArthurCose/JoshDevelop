import ClientFileNode from "./ClientFileNode.js";

export default class ClientFolderNode extends ClientFileNode
{
  constructor(name, parentFolder, fileTree)
  {
    super(name, parentFolder, fileTree);
    this.isFile = false;
    this.children = [];
    this.requestedData = false;
    this.populated = false;

    this.expandButton = document.createElement("span");
    this.listElement = document.createElement("ul");

    this.expandButton.innerHTML = "&#x1f4c1;";
    this.expandButton.className = "status";
    this.listElement.style.display = "none";

    this.controlElement.insertBefore(this.expandButton, this.controlElement.firstChild);
    this.controlElement.addEventListener("click", () => this.toggleDisplay());

    this.addEvent("populate");

    this.on("contextmenu", (menu) =>
      this.addFolderSpecificMenuItems(menu)
    );
  }

  get expanded()
  {
    return this.listElement.style.display == "block";
  }

  toggleDisplay()
  {
    this.listElement.style.display = this.expanded ? "none" : "block";
    this.expandButton.innerHTML = this.expanded ? "&#x1f4c2;" : "&#x1f4c1;";

    if(this.expanded && !this.requestedData) {
      this.requestData();
    }
  }

  requestData()
  {
    this.requestedData = true;

    this.fileTree.manager.session.send({
      type: "filemanager",
      action: "request",
      path: this.clientPath
    });
  }

  addFolderSpecificMenuItems(menu)
  {
    let session = this.fileTree.manager.session;

    let addMenu = menu.addSubmenuBefore("Cut", "Add New");
    addMenu.addButton("File", () => this.createNewNode(true));
    addMenu.addButton("Folder",  () => this.createNewNode(false));

    let clipboard = this.fileTree.manager.clipboard;

    if(clipboard.contentExists) {
      menu.addButtonAfter("Copy", "Paste", () =>
        clipboard.paste(this.clientPath)
      );
    }

    menu.addButton("Empty", () => {
      session.send({
        type: "filemanager",
        action: "empty",
        path: this.clientPath,
      });
    });

    menu.addButton("Refresh", () => {
      session.send({
        type: "filemanager",
        action: "refresh",
        path: this.clientPath,
      });
    });
  }

  createNewNode(isFile)
  {
    let input = document.createElement("input");
    input.value = isFile ? "New File" : "New Folder";
    let removed = false;

    let remove = () => {
      removed = true;
      input.remove();
    }

    let namingCompleted = () => {
      if(removed)
        return;

      this.fileTree.manager.session.send({
        type: "filemanager",
        action: "add",
        parentPath: this.clientPath,
        isFile: isFile,
        name: input.value
      });

      remove();
    };

    input.addEventListener("blur", namingCompleted);
    input.addEventListener("keydown", (e) => {
      if(e.which == 13)
        namingCompleted();
      if(e.which == 27)
        remove();
    });

    // make sure this folder is expanded
    if(!this.expanded)
      this.toggleDisplay();

    // insert the node
    this.listElement.insertBefore(input, this.listElement.firstChild);
    input.focus();
    input.setSelectionRange(0, input.value.length);
  }

  registerSubFolder(name)
  {
    let folder = new ClientFolderNode(name, this, this.fileTree);
    this.registerNode(folder);

    this.fileTree.triggerEvent("add", folder);

    return folder;
  }

  registerFile(name)
  {
    let file = new ClientFileNode(name, this, this.fileTree);
    this.registerNode(file);

    this.fileTree.triggerEvent("add", file);

    return file;
  }

  registerNode(node)
  {
    this.insertNode(node);
    node.append();
  }

  append()
  {
    super.append();
    this.parentFolder.listElement.insertBefore(this.listElement, this.controlElement.nextSibling);
  }

  // used to sort files alphabetically
  // returns the index that the node was placed at
  insertNode(node)
  {
    let index = 0;

    for(index; index < this.children.length; index++) {
      let child = this.children[index];

      // found a file, this folder should go before it
      if(!node.isFile && child.isFile)
        break;
      // this is a file, place it after folders
      if(node.isFile && !child.isFile)
        continue;
      // compare names
      if(node.name > child.name)
        continue;

      break;
    }

    this.children.splice(index, 0, node);
  }

  destroy()
  {
    super.destroy();
    this.listElement.remove();
  }
}
