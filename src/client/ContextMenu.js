export default class ContextMenu
{
  constructor(x, y)
  {
    this.element = document.createElement("div");
    this.element.className = "contextmenu";
    this.element.style.left = x + "px";
    this.element.style.top = y + "px";
    this.element.tabIndex = 0;
    this.destroyed = false;

    this.submenu = undefined;

    this.element.addEventListener("blur", (e) =>
    {
      if(!this.isChildElement(e.relatedTarget))
        this.destroy();
    });

    this.rootMenu = this;
  }

  isChildElement(element)
  {
    while(element != null) {
      if(this.element == element)
        return true;

      element = element.parentElement;
    }
    return false;
  }

  appendToElement(parentElement)
  {
    parentElement.appendChild(this.element);
    this.element.focus();
  }

  getButton(label)
  {
    for(let node of this.element.childNodes)
      if(node.innerText == label)
        return node;
    return undefined;
  }

  addButton(label, clickDelegate, destroy)
  {
    let menuItem = this.createButton(label, clickDelegate, destroy);
    this.element.appendChild(menuItem);

    return menuItem;
  }

  addButtonBefore(nextLabel, label, clickDelegate, destroy)
  {
    let menuItem = this.createButton(label, clickDelegate, destroy);
    let nextButton = this.getButton(nextLabel);

    this.element.insertBefore(menuItem, nextButton);

    return menuItem;
  }

  addButtonAfter(previousLabel, label, clickDelegate, destroy)
  {
    let menuItem = this.createButton(label, clickDelegate, destroy);
    let previousButton = this.getButton(previousLabel);

    this.element.insertBefore(menuItem, previousButton.nextSibling);

    return menuItem;
  }

  createButton(label, clickDelegate, destroy)
  {
    if(destroy == null)
      destroy = true;

    let menuItem = document.createElement("div");
    menuItem.className = "menuitem";
    menuItem.innerText = label;

    menuItem.addEventListener("click", () => {
      if(clickDelegate)
        clickDelegate();

      if(destroy)
        this.rootMenu.destroy();
    });

    menuItem.addEventListener("mouseover", () => {
      if(this.submenu != undefined)
        this.submenu.destroy();
    });

    return menuItem;
  }

  addBreak()
  {
    let breakElement = document.createElement("hr");
    this.element.appendChild(breakElement);
    return breakElement;
  }

  addSubmenu(label)
  {
    let submenu = new ContextMenu(0, this.element.clientY);
    submenu.rootMenu = this;

    let button = this.addButton(label);
    button.style.cursor = "default";

    let rightArrow = document.createElement("span");
    rightArrow.style.float = "right";
    rightArrow.innerText = ">";
    button.appendChild(rightArrow);

    button.addEventListener("mouseover", () => {
      let x = this.element.offsetWidth;
      submenu.element.style.top = "0px";
      submenu.element.style.left = x + "px";
      submenu.destroyed = false;

      this.element.appendChild(submenu.element);
      this.submenu = submenu;
    });

    this.element.appendChild(button);

    return submenu;
  }

  destroy()
  {
    if(this.destroyed)
      return;

    this.destroyed = true;
    this.element.remove();
  }
}