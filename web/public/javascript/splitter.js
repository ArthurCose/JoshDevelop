class Split extends EventRaiser
{
  constructor(elementA, elementB)
  {
    super();
    this.splitElement = document.createElement("div");
    this.splitterElement = document.createElement("div");
    this.elementA = elementA;
    this.elementB = elementB;
    this.lastMousePosition = undefined;
    
    elementA.parentNode.appendChild(this.splitElement);

    this.elementB.style.flex = 1;
    this.elementB.style.flexBasis = "auto";

    this.splitElement.appendChild(elementA);
    this.splitElement.appendChild(this.splitterElement);
    this.splitElement.appendChild(elementB);
    
    this.addEvent("resize");
    
    window.addEventListener("mousedown", (e) => this.mousedown(e), false);
    window.addEventListener("mousemove", (e) => this.mousemove(e), false);
    window.addEventListener("mouseup", () => this.mouseup(), false);
  }
  
  mousedown(e)
  {
    if(e.target == this.splitterElement)
    {
      this.lastMousePosition = { x: e.screenX, y: e.screenY};
      document.body.style.userSelect = "none";
    }
  }
  
  mousemove(e)
  {
    if(this.lastMousePosition == undefined)
      return;
    
    let offset = {};
    offset.x = e.screenX - this.lastMousePosition.x;
    offset.y = e.screenY - this.lastMousePosition.y;
    this.moved(offset);
    
    this.lastMousePosition.x = e.screenX;
    this.lastMousePosition.y = e.screenY;
  }
  
  mouseup()
  {
    this.lastMousePosition = null;
    document.body.style.userSelect = "";
  }
  
  moved(offset)
  {
    // abstract
  }
  
  resized()
  {
    this.triggerEvent("resize");
  }
}

/**
 * wrap wrap wrap auto
 */
class HSplit extends Split
{
  constructor(elementA, elementB)
  {
    super(elementA, elementB);
    this.splitElement.className = "hsplit";
    this.splitterElement.className = "hsplitter";
  }
  
  moved(offset)
  {
    let splitterTop = this.splitterElement.offsetTop - this.splitElement.offsetTop;
    
    this.elementA.style.height = splitterTop + offset.y + "px";
    
    this.resized();
  }
}

class VSplit extends Split
{
  constructor(elementA, elementB)
  {
    super(elementA, elementB);
    this.splitElement.className = "vsplit";
    this.splitterElement.className = "vsplitter";
  }
  
  moved(offset)
  {
    let splitterLeft = this.splitterElement.offsetLeft - this.splitElement.offsetLeft;
    
    this.elementA.style.width = splitterLeft + offset.x + "px";

    this.resized();
  }
}