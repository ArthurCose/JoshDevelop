import ContextMenu from "./ContextMenu.js";
import EventRaiser from "../shared/EventRaiser.mjs";

/*   <div id=tabbedcontainer>
 *     <div class=tabcontainer></div>
 *     <div class=tabcontent></div>
 *   </div>
 */

export class Tab extends EventRaiser
{
  constructor(identifier, content, tabElement, container)
  {
    super();

    this.identifier = identifier;
    this.content = content;
    this.tabElement = tabElement;
    this.container = container;
    this.locked = false;

    this.nameElement = document.createElement("span");
    this.closeElement = document.createElement("span");

    this.tabElement.className = "tab";
    this.tabElement.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    this.tabElement.addEventListener("mouseup", (e) => this.onMouseUp(e));
    
    this.nameElement.className = "name";

    this.closeElement.className = "close";
    this.closeElement.innerHTML = "x";
    this.closeElement.addEventListener("click", () => this.destroy());

    this.tabElement.appendChild(this.nameElement);
    this.tabElement.appendChild(this.closeElement);

    this.addEvent("active");
    this.addEvent("resize");
    this.addEvent("contextmenu");
    this.addEvent("close");
  }

  get isActive()
  {
    return this.container.activeTab == this;
  }

  get hoverText()
  {
    return this.tabElement.title;
  }

  set hoverText(value)
  {
    this.tabElement.title = value;
  }

  lock()
  {
    this.closeElement.style.display = "none";
    this.locked = true;
  }

  get name()
  {
    return this.nameElement.innerText;
  }

  set name(value)
  {
    this.nameElement.innerText = value;
  }

  onContextMenu(e)
  {
    let menu = new ContextMenu(e.clientX, e.clientY);

    menu.addButton("Close", () => this.destroy());
    menu.addButton("Close Others", () => this.closeOthers());
    menu.addButton("Close All", () => this.closeAll());

    menu.appendToElement(document.body);

    e.preventDefault();
  }

  closeOthers()
  {
    let tabs = [...this.container.tabs];

    for(let tab of tabs)
      if(tab != this)
        tab.destroy();
  }

  closeAll()
  {
    let tabs = [...this.container.tabs];

    for(let tab of tabs)
      tab.destroy();
  }

  onMouseUp(e)
  {
    switch(e.which) {
    case 1:
      this.makeActive();
      break;
    case 2:
      if(!this.locked)
        this.destroy();
      break;
    }
  }

  makeActive()
  {
    if(this.container.activeTab != undefined) {
      this.container.activeTab.content.style.display = "none";
      this.container.activeTab.tabElement.className = "tab";
    }

    this.container.activeTab = this;
    this.content.style.display = "";
    this.tabElement.className = "tab active";

    this.container.triggerEvent("swap", this);
    this.triggerEvent("active");
    this.resized();
  }

  resized()
  {
    this.triggerEvent("resize");
  }

  destroy()
  {
    let index = this.container.tabs.indexOf(this);

    if(this.isActive) {
      if(this.container.tabs.length > 1) {
        // find another tab to make active
        let activeIndex = index == 0 ? 1 : index - 1;

        this.container.tabs[activeIndex].makeActive();
      } else {
        // no other tabs
        this.container.activeTab = undefined;
      }
    }

    this.tabElement.remove();
    this.content.remove();
    this.container.tabs.splice(index, 1);

    this.triggerEvent("close");
  }
}

export class TabbedContainer extends EventRaiser
{
  // css selector or element object
  constructor(element)
  {
    super();

    if(typeof element == "string")
      element = document.querySelector(element);

    this.element = element;
    this.activeTab = undefined;
    this.tabs = [];

    this.tabcontainer = element.querySelector(".tab-container");
    this.tabcontent = element.querySelector(".tab-content");

    this.addEvent("swap");
    this.addEvent("resize");
  }

  get length()
  {
    return this.tabs.length;
  }

  addTab(identifier, name, content)
  {
    let tabElement = document.createElement("div");
    let tab = new Tab(identifier, content, tabElement, this);

    tab.name = name;
    content.style.display = "none";

    this.tabcontainer.appendChild(tabElement);
    this.tabcontent.appendChild(content);

    this.tabs.push(tab);

    return tab;
  }

  removeTab(identifier)
  {
    let tab = this.getTab(identifier);
    tab.destroy()
  }

  getTab(identifier)
  {
    for(let tab of this.tabs)
      if(tab.identifier == identifier)
          return tab;

    return undefined;
  }

  resized()
  {
    if(this.activeTab != null)
      this.activeTab.resized();

    this.triggerEvent("resize");
  }
}