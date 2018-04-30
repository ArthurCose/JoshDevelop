import FileNode from "../../shared/FileNode.mjs";
import ContextMenu from "../ContextMenu.js";

export default class ClientFileNode extends FileNode
{
  constructor(name, parentFolder, fileTree)
  {
    super(name, parentFolder, fileTree);

    // specific to client file/folder nodes
    // (node, menu)
    this.addEvent("contextmenu");
    // (node, button)
    this.addEvent("click");

    this.controlElement = document.createElement("li");
    this.nameElement = document.createElement("span");

    this.nameElement.innerText = this.name;

    this.controlElement.appendChild(this.nameElement);
    this.controlElement.addEventListener("contextmenu", (e) => this.onRightClick(e));
    this.controlElement.addEventListener("click", (e) => this.triggerEvent("click", e.button));

    this.on("click", (button) =>
      fileTree.manager.triggerEvent("click", this, button)
    );
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

    let clipboard = this.fileTree.manager.clipboard;

    menu.addButton("Cut", () => clipboard.cut(this));
    menu.addButton("Copy", () => clipboard.copy(this));
    menu.addButton("Rename", () => this.rename());
    menu.addButton("Delete", () => this.unlink());

    this.triggerEvent("contextmenu", menu);

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
      this.fileTree.manager.session.send({
        type: "filemanager",
        action: "rename",
        path: this.clientPath,
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
    let session = this.fileTree.manager.session;

    session.send({
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
