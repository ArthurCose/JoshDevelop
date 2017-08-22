class ClientFileManager extends FileTree
{
  constructor()
  {
    super();

    this.root = new ClientFolderNode(this, undefined, "");
    this.clipboard = new FileClipboard();
    this.listeners = [];

    this.element = document.getElementById("filetree");

    this.root.controlElement.className += " root";
    this.root.toggleDisplay();
    
    this.element.appendChild(this.root.controlElement);
    this.element.appendChild(this.root.listElement);
  }

  reset()
  {
    while(this.root.children.length > 0)
      this.root.children[0].destroy();
  }
  
  fileClicked(node)
  {
    for(let listener of this.listeners)
      listener(node);
  }
  
  addListener(listener)
  {
    this.listeners.push(listener);
  }
  
  messageReceived(e)
  {
    let node;
    
    switch(e.action)
    {
    case "add":
      node = this.registerNode(e.path, e.isFile);

      node.controlElement.addEventListener("click", () => this.fileClicked(node));
      break;
    case "remove":
      node = this.getNode(e.path, e.isFile);
      
      if(node)
        node.unlink();
      break;
    case "rename":
      node = this.getNode(e.oldPath, e.isFile);
      node.name = e.newName;

      if(node.parentFolder != undefined)
      {
        // remove and add the node back, to sort it
        node.destroy();
        node.parentFolder.insertNode(node);
        node.append();
      }

      node.triggerEvent("rename");
      break;
    }
  }
}

class ClientFileNode extends FileNode
{
  constructor(filetree, parentFolder, name)
  {
    super(filetree, parentFolder, name);

    this.controlElement = document.createElement("li");
    this.nameElement = document.createElement("span");
    
    this.nameElement.innerText = this.name;
    
    this.controlElement.appendChild(this.nameElement);
    this.controlElement.addEventListener("contextmenu", (e) => this.onRightClick(e));
  }
  
  get name()
  {
    return super.name;
  }
  
  set name(value)
  {
    super.name = value;
    this.nameElement.innerText = value;
  }
  
  onRightClick(e)
  {
    let menu = new ContextMenu(e.clientX, e.clientY);
    menu.element.addEventListener('focus', () => this.controlElement.classList.add("selected"));
    menu.element.addEventListener('blur', () => this.controlElement.classList.remove("selected"));
    
    if(!this.isFile)
    {
      let addMenu = menu.addSubmenu("Add New");
      addMenu.addButton("File", () => this.createNewNode(true));
      addMenu.addButton("Folder",  () => this.createNewNode(false));
    }

    menu.addButton("Cut", () => this.filetree.clipboard.cut(this));
    menu.addButton("Copy", () => this.filetree.clipboard.copy(this));

    if(!this.isFile && this.filetree.clipboard.contentExists)
      menu.addButton("Paste", () => this.filetree.clipboard.paste(this.clientPath));
    
    menu.addButton("Rename", () => this.rename());

    menu.addButton("Download", () => {
      let filePath = encodeURIComponent(this.clientPath);
      let projectName = encodeURIComponent(session.project);

      window.location = `/download?project=${projectName}&path=${filePath}`;
    });
    
    menu.addButton("Delete", () => this.delete());
    
    if(!this.isFile)
    {
      menu.addButton("Empty", () => {
        session.send({
          type: 'filemanager',
          action: 'empty',
          path: this.clientPath,
        });
      });
      
      menu.addButton("Refresh", () => {
        session.send({
          type: 'filemanager',
          action: 'refresh',
          path: this.clientPath,
        });
      });
    }

    menu.appendToElement(document.body);
    
    e.preventDefault();
  }
  
  append()
  {
    let index = this.parentFolder.children.indexOf(this);
    let nextNode = this.parentFolder.children[index + 1];
    let nextElement = nextNode != undefined ? nextNode.controlElement : undefined;
    
    this.parentFolder.listElement.insertBefore(this.controlElement, nextElement);
  }

  rename()
  {
    let renameElement = document.createElement("input");

    renameElement.value = this.name;

    renameElement.addEventListener("click", (e) => e.stopPropagation());
    renameElement.addEventListener("change", () => renameElement.blur());
    renameElement.addEventListener("blur", () => {
      session.send({
        type: 'filemanager',
        action: 'rename',
        oldPath: this.clientPath,
        isFile: this.isFile,
        newName: renameElement.value
      });

      // bring back the name element
      this.controlElement.replaceChild(
        this.nameElement,
        renameElement
      );
    });

    // show the input
    this.controlElement.replaceChild(
      renameElement,
      this.nameElement
    );

    renameElement.focus();
  }
  
  delete()
  {
    session.send({
      type: 'filemanager',
      action: 'delete',
      path: this.clientPath,
      isFile: this.isFile
    });
  }
  
  destroy()
  {
    if(this.parentFolder == undefined)
      return;
    
    this.controlElement.remove();
    super.destroy();
  }
}

class ClientFolderNode extends ClientFileNode
{
  constructor(filetree, parentFolder, name)
  {
    super(filetree, parentFolder, name);
    this.isFile = false;
    this.children = [];
    
    this.expandButton = document.createElement("span");
    this.listElement = document.createElement("ul");
    
    this.expandButton.innerHTML = "&#x1f4c1;";
    this.expandButton.className = "status";
    this.listElement.style.display = "none";
    
    this.controlElement.insertBefore(this.expandButton, this.controlElement.firstChild);
    this.controlElement.addEventListener("click", () => this.toggleDisplay());

    // allow dragging files
    this.controlElement.addEventListener("dragover", (e) => e.preventDefault());
    this.listElement.addEventListener("dragover", (e) => e.preventDefault());

    this.controlElement.addEventListener("drop", (e) => this.dropFiles(e));
    this.listElement.addEventListener("drop", (e) => this.dropFiles(e));
  }

  get expanded()
  {
    return this.listElement.style.display == "block";
  }
  
  toggleDisplay()
  {
    this.listElement.style.display = this.expanded ? "none" : "block";
    this.expandButton.innerHTML = this.expanded ? "&#x1f4c2;" : "&#x1f4c1;";
  }

  dropFiles(e)
  {
    e.stopPropagation();
    e.preventDefault();

    let files = e.target.files || e.dataTransfer.files;
    let safeclientPath = encodeURIComponent(this.clientPath);
    
    let xhr = new XMLHttpRequest();
    let formData = new FormData();

    for(let file of files)
      formData.append(file.name, file);

    xhr.addEventListener("readystatechange", () => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        displayPopup(xhr.responseText);
      }
    });

    displayPopup(`Uploading ${files.length} file(s).`);

    xhr.open(
      'POST',
      window.location.origin + "/upload?parentPath=" + safeclientPath,
      true
    );

    xhr.send(formData);
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
      
      session.send({
        type: 'filemanager',
        action: 'add',
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
  }
  
  registerSubFolder(name)
  {
    let folder = new ClientFolderNode(this.filetree, this, name);
    this.insertNode(folder);
    folder.append();
    
    return folder;
  }
  
  registerFile(name)
  {
    let file = new ClientFileNode(this.filetree, this, name);
    this.insertNode(file);
    file.append();
    
    return file;
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
    
    for(index; index < this.children.length; index++)
    {
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

class FileClipboard
{
  constructor()
  {
    this._node = undefined;
    this._cut = false;
  }
  
  get contentExists()
  {
    return this._node != undefined;
  }

  cut(node)
  {
    this._cut = true;
    this._node = node;
  }

  copy(node)
  {
    this._cut = false;
    this._node = node;
  }

  paste(folderPath)
  {
    if(!this.contentExists)
      return;

    session.send({
      type: 'filemanager',
      action: 'paste',
      parentPath: folderPath,
      path: this._node.clientPath,
      isFile: this._node.isFile,
      cut: this._cut
    });

    this._node = undefined;
  }
}