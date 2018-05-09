import ContextMenu from "./ContextMenu.js";
import EventRaiser from "../shared/EventRaiser.mjs";

/*   <div id=tabbedcontainer>
 *     <div class=tabcontainer></div>
 *     <div class=tabcontent></div>
 *   </div>
 */

export class Tab extends EventRaiser
{
  constructor(identifier, content, element, container)
  {
    super();

    this._identifier = identifier;
    this.content = content;
    this.element = element;
    this.container = container;
    this.locked = false;

    this.nameElement = document.createElement("span");
    this.closeElement = document.createElement("span");

    this.element.className = "tab";
    this.element.addEventListener("contextmenu", (e) => this.onContextMenu(e));
    this.element.addEventListener("mousedown", (e) => this.onMouseDown(e));
    this.element.addEventListener("mouseup", (e) => this.onMouseUp(e));
    
    this.nameElement.className = "name";

    this.closeElement.className = "close";
    this.closeElement.innerHTML = "x";
    this.closeElement.addEventListener("mousedown", (e) => e.stopPropagation());
    this.closeElement.addEventListener("click", () => this.destroy());

    this.element.appendChild(this.nameElement);
    this.element.appendChild(this.closeElement);

    this.addEvent("active");
    this.addEvent("rename");
    this.addEvent("reidentify");
    this.addEvent("resize");
    this.addEvent("slide");
    this.addEvent("contextmenu");
    this.addEvent("close");
  }

  get isActive()
  {
    return this.container.activeTab == this;
  }

  get hoverText()
  {
    return this.element.title;
  }

  set hoverText(value)
  {
    this.element.title = value;
  }

  get name()
  {
    return this.nameElement.innerText;
  }

  set name(value)
  {
    let oldName = this.nameElement.innerText;

    this.nameElement.innerText = value;

    this.triggerEvent("rename", oldName);
  }

  get identifier() {
    return this._identifier;
  }

  set identifier(value) {
    let oldIdentifier = this._identifier;

    this._identifier = value;

    this.triggerEvent("reidentify", oldIdentifier);
  }

  lock()
  {
    this.closeElement.style.display = "none";
    this.locked = true;
  }

  closeOthers()
  {
    let tabs = [...this.container.tabs];

    for(let tab of tabs)
      if(tab != this)
        tab.destroy();
  }

  closeToTheRight()
  {
    let index = this.container.tabs.indexOf(this);
    let tabs = this.container.tabs.slice(index + 1);

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

  makeActive()
  {
    if(this.container.activeTab != undefined) {
      this.container.activeTab.content.style.display = "none";
      this.container.activeTab.element.className = "tab";
    }

    this.container.activeTab = this;
    this.content.style.display = "";
    this.element.className = "tab active";

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

    this.element.remove();
    this.content.remove();
    this.container.tabs.splice(index, 1);

    this.container.triggerEvent("remove", this);
    this.triggerEvent("close");
  }

  onContextMenu(e)
  {
    let menu = new ContextMenu(e.clientX, e.clientY);

    menu.addButton("Close", () => this.destroy());
    menu.addButton("Close Others", () => this.closeOthers());
    menu.addButton("Close To The Right", () => this.closeToTheRight());
    menu.addButton("Close All", () => this.closeAll());

    menu.appendToElement(document.body);

    e.preventDefault();
  }

  onMouseDown(e)
  {
    let leftMouse = e.which == 1;

    if(leftMouse)
      this.makeActive();

    if(leftMouse && !this.locked) {
      let dragListener = (e) => this.onDrag(e);
      let releaseListener = (e) => {
        document.body.removeEventListener("mousemove", dragListener);
        document.body.removeEventListener("mouseup", releaseListener);
      };

      document.body.addEventListener("mousemove", dragListener);
      document.body.addEventListener("mouseup", releaseListener);
    }
  }

  onDrag(e)
  {
    let tabUnderMouse = this.container.getTabUnderMouse(e);

    if(tabUnderMouse == this)
      return;

    let placeBefore =
      tabUnderMouse.element.offsetLeft < this.element.offsetLeft;

    // remove this tab from the tabs array
    let currentIndex = this.container.tabs.indexOf(this);
    this.container.tabs.splice(currentIndex, 1);

    // place this tab back relative to the tab under the mouse
    let tabIndex = this.container.tabs.indexOf(tabUnderMouse);
    this.container.tabs.splice(
      placeBefore ? tabIndex : tabIndex + 1,
      0,
      this
    );

    // update ui to match previous action
    this.element.remove();
    this.container.tabcontainer.insertBefore(
      this.element,
      placeBefore ? tabUnderMouse.element : tabUnderMouse.element.nextSibling
    );

    this.triggerEvent("slide");
    this.container.triggerEvent("slide", this);
  }

  onMouseUp(e)
  {
    let middleMouse = e.which == 2;

    if(middleMouse && !this.locked)
      this.destroy();
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

    this.tabcontainer = this.ensureElement("tab-container");
    this.tabcontent = this.ensureElement("tab-content");
    
    this.addEvent("add");
    this.addEvent("remove");
    this.addEvent("swap");
    this.addEvent("slide");
    this.addEvent("resize");
  }

  ensureElement(className)
  {
    let element = this.element.querySelector(`.${className}`);

    if(!element) {
      element = document.createElement("div");
      element.className = className;
      this.element.appendChild(element);
    }

    return element;
  }

  get length()
  {
    return this.tabs.length;
  }

  addTab(identifier, name, content)
  {
    let element = document.createElement("div");
    let tab = new Tab(identifier, content, element, this);

    tab.name = name;
    content.style.display = "none";

    this.tabcontainer.appendChild(element);
    this.tabcontent.appendChild(content);

    this.tabs.push(tab);

    this.triggerEvent("add", tab);

    return tab;
  }

  removeTab(identifier)
  {
    let tab = this.getTab(identifier);
    tab.destroy();
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

  getTabUnderMouse(e) {
    let x = e.pageX - this.tabcontainer.offsetLeft;

    if(x < 0)
      return this.tabs[0];

    for(let tab of this.tabs) {
      let right = tab.element.offsetLeft + tab.element.offsetWidth;

      if(x < right)
        return tab;
    }
  }
}
