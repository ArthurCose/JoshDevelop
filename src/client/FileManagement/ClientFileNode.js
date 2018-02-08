import FileNode from "../../shared/FileNode.mjs";
import ContextMenu from "../ContextMenu.js";

export default class ClientFileNode extends FileNode
{
  constructor(name, parentFolder, filetree)
  {
    super(name, parentFolder, filetree);

    // specific to client file/folder nodes
    // (node, menu)
    this.addEvent("menu");

    this.controlElement = document.createElement("li");
    this.nameElement = document.createElement("span");

    this.nameElement.innerText = this.name;

    this.controlElement.appendChild(this.nameElement);
    this.controlElement.addEventListener("contextmenu", (e) => this.onRightClick(e));

    this.filetree.triggerEvent("add", this);
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
    menu.element.addEventListener("focus", () => this.controlElement.classList.add("selected"));
    menu.element.addEventListener("blur", () => this.controlElement.classList.remove("selected"));

    if(!this.isFile) {
      let addMenu = menu.addSubmenu("Add New");
      addMenu.addButton("File", () => this.createNewNode(true));
      addMenu.addButton("Folder",  () => this.createNewNode(false));
    }

    menu.addButton("Cut", () => this.filetree.clipboard.cut(this));
    menu.addButton("Copy", () => this.filetree.clipboard.copy(this));

    if(!this.isFile && this.filetree.clipboard.contentExists)
      menu.addButton("Paste", () => this.filetree.clipboard.paste(this.clientPath));

    menu.addButton("Rename", () => this.rename());

    menu.addButton("Delete", () => this.unlink());

    if(!this.isFile) {
      menu.addButton("Empty", () => {
        this.filetree.session.send({
          type: "filemanager",
          action: "empty",
          path: this.clientPath,
        });
      });

      menu.addButton("Refresh", () => {
        this.filetree.session.send({
          type: "filemanager",
          action: "refresh",
          path: this.clientPath,
        });
      });
    }

    this.triggerEvent("menu", menu);

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
      this.filetree.session.send({
        type: "filemanager",
        action: "move",
        path: this.clientPath,
        parentPath: this.parentClientPath,
        isFile: this.isFile,
        name: renameElement.value
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
    renameElement.setSelectionRange(0, renameElement.value.length);
  }

  unlink()
  {
    this.filetree.session.send({
      type: "filemanager",
      action: "delete",
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
