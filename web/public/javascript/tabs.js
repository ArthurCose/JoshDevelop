/*   <div id=tabbedcontainer>
 *     <div class=tabcontainer></div>
 *     <div class=tabcontent></div>
 *   </div>
 */

class Tab extends EventRaiser
{
  constructor(container, identifier, tabElement, content)
  {
    super();
    
    this.container = container;
    this.identifier = identifier;
    this.tabElement = tabElement;
    this.content = content;
    this.locked = false;

    this.nameElement = document.createElement("span");
    this.closeElement = document.createElement("span");
    
    this.tabElement.className = "tab";
    this.tabElement.addEventListener("mouseup", (e) => this.mouseup(e), false);

    this.nameElement.className = "name";

    this.closeElement.className = "close";
    this.closeElement.innerHTML = "x";
    this.closeElement.addEventListener("click", () => this.destroy());
    
    this.tabElement.appendChild(this.nameElement);
    this.tabElement.appendChild(this.closeElement);

    this.addEvent("active");
    this.addEvent("resize");
    this.addEvent("close");
  }

  get isActive()
  {
    return this.container.activeTab == this;
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

  mouseup(e)
  {
    switch(e.which)
    {
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
    if(this.container.activeTab != undefined)
    {
      this.container.activeTab.content.style.display = "none";
      this.container.activeTab.tabElement.className = "tab";
    }
    
    this.container.activeTab = this;
    this.content.style.display = "";
    this.tabElement.className = "tab active";
    
    this.triggerEvent("active");
  }
  
  resized()
  {
    this.triggerEvent("resize");
  }
  
  destroy()
  {
    let index = this.container.tabs.indexOf(this);
    
    if(this.isActive && this.container.tabs.length > 1)
    {
      let activeIndex = index == 0 ? 1 : index - 1;

      this.container.tabs[activeIndex].makeActive();
    }
    
    this.tabElement.remove();
    this.content.remove();
    this.container.tabs.splice(index, 1);
    
    this.triggerEvent("close");
  }
}

class TabbedContainer extends EventRaiser
{
  // css selector or element object
  constructor(element)
  {
    super();

    if(typeof element == "string")
      element = document.querySelector(element);

    this.element = element;
    this.tabcontainer = element.querySelector(".tab-container");
    this.tabcontent = element.querySelector(".tab-content");
    this.activeTab = undefined;
    this.tabs = [];

    this.addEvent("resize");
  }

  get length()
  {
    return this.tabs.length;
  }
  
  addTab(identifier, name, content)
  {
    let tabElement = document.createElement("div");
    let tab = new Tab(this, identifier, tabElement, content);

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