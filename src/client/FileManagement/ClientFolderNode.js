import ClientFileNode from "./ClientFileNode.js";

export default class ClientFolderNode extends ClientFileNode
{
  constructor(name, parentFolder, filetree)
  {
    super(name, parentFolder, filetree);
    this.isFile = false;
    this.children = [];

    this.expandButton = document.createElement("span");
    this.listElement = document.createElement("ul");

    this.expandButton.innerHTML = "&#x1f4c1;";
    this.expandButton.className = "status";
    this.listElement.style.display = "none";

    this.controlElement.insertBefore(this.expandButton, this.controlElement.firstChild);
    this.controlElement.addEventListener("click", () => this.toggleDisplay());
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

      this.filetree.session.send({
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
    let folder = new ClientFolderNode(name, this, this.filetree);
    this.registerNode(folder);

    this.filetree.triggerEvent("add", folder);

    return folder;
  }

  registerFile(name)
  {
    let file = new ClientFileNode(name, this, this.filetree);
    this.registerNode(file);

    this.filetree.triggerEvent("add", file);

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
