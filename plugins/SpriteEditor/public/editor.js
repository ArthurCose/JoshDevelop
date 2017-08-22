class SpriteEditor extends Editor
{
  constructor(tab, fileNode, id)
  {
    super(tab, fileNode, id);
    element.classList.add("sprite-editor");

    this.width = 32;
    this.height = 32;
    this.colors = [];
    this.layers = [];
    this.selectedLayer;
    this.selection;
    this.tool = new Pencil(this);

    this.x = 0;
    this.y = 0;
    this.zoom = 1;

    this.canvasHolderElement = document.createElement("div");
    this.canvasHolderElement.className = "canvas-holder";
    this.element.appendChild(this.canvasHolderElement);

    this.canvas = this.createCanvas();
    this.canvasHolderElement.appendChild(this.canvas);

    this.selectedColorsElement = document.createElement("div")
    this.selectedColorsElement.className = "selected-colors";
    this.canvasHolderElement.appendChild(this.selectedColorsElement);

    this.leftColorElement = this.createColorElement();
    this.selectedColorsElement.appendChild(this.leftColorElement);
    this.leftColor = "#000000";

    this.rightColorElement = this.createColorElement();
    this.selectedColorsElement.appendChild(this.rightColorElement);
    this.rightColor = "#ffffff";

    this.ctx = this.canvas.getContext("2d");

    // panel with all of our tools
    this.rightPanelElement = document.createElement("div");
    this.rightPanelElement.className = "panel";
    let vsplit = new VSplit(this.canvasHolderElement, this.rightPanelElement);
    vsplit.on("resize", () => this.canvasResized());

    this.toolsElement = document.createElement("div");
    this.toolsElement.className = "tools";
    this.toolsElement.innerHTML = "Tools: <br />";
    this.rightPanelElement.appendChild(this.toolsElement);

    this.toolsElement.appendChild(this.tool.iconContainer);
    this.toolsElement.appendChild(new Eraser(this).iconContainer);

    // layers
    this.layersElement = document.createElement("div");
    this.layersElement.className = "layers";
    this.layersElement.innerHTML = "Layers: <br />";
    let hsplit = new HSplit(this.toolsElement, this.layersElement);


    tab.on("resize", () => this.canvasResized());
    tab.on("active", () => this.canvasResized());

    this.addLayer("Layer " + this.layers.length);
  }

  get leftColor()
  {
    return this.leftColorElement.value;
  }

  get rightColor()
  {
    return this.rightColorElement.value;
  }

  set leftColor(value)
  {
    this.leftColorElement.value = value;
  }

  set rightColor(value)
  {
    this.rightColorElement.value = value;
  }

  createColorElement()
  {
    let colorElement = document.createElement("input");
    colorElement.type = "color";
    colorElement.className = "color";
    return colorElement;
  }

  createCanvas()
  {
    let mouseOldX;
    let mouseOldY;
    let mouseX;
    let mouseY;
    let mouseButton = -1;

    let canvas = document.createElement("canvas");
    canvas.className = "sprite-viewer";

    canvas.addEventListener("mousemove", (e) => {
      let bounds = canvas.getBoundingClientRect();

      mouseX = e.clientX - bounds.left - bounds.width / 2;
      mouseY = e.clientY - bounds.top - bounds.height / 2;

      mouseX = mouseX / this.zoom - this.x + this.width / 2;
      mouseY = mouseY / this.zoom - this.y + this.height / 2;
      
      if(mouseButton == 1)
      {
        // add deltas to transform
        this.x += (e.clientX - mouseOldX) / this.zoom;
        this.y += (e.clientY - mouseOldY) / this.zoom;
        this.render();
      }

      this.tool.mouseEvent("mousemove", mouseX, mouseY, mouseButton);
      
      mouseOldX = e.clientX;
      mouseOldY = e.clientY;
    });

    canvas.addEventListener("wheel", (e) => {
      let newZoom = this.zoom - e.deltaY / 20;

      if(newZoom > 0)
        this.zoom = newZoom;
      
      this.render();
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("mousedown", (e) => {
      mouseButton = e.button;
      this.tool.mouseEvent("mousedown", mouseX, mouseY, mouseButton);
    });
    canvas.addEventListener("mouseup", (e) => {
      mouseButton = -1;
      this.tool.mouseEvent("mouseup", mouseX, mouseY, mouseButton);
    });

    return canvas;
  }

  canvasResized()
  {
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.render();
  }

  /**
   * Gets a color index for the color written in hex.
   * Appends the color if it was missing.
   * @param {string} hex 
   */
  getColorIndex(hex)
  {
    let index = this.colors.indexOf(hex);

    if(index == -1)
      index = this.colors.push(hex) - 1;
    
    return index;
  }

  addLayer(name)
  {
    let layer = new Layer(this.width, this.height, this.colors);
    layer.name = name;

    layer.layerElement.addEventListener("click", () => this.selectLayer(layer));

    let lastLayer = this.layers[this.layers.length - 1];

    this.layersElement.insertBefore(layer.layerElement, lastLayer ? lastLayer.layerElement : undefined);
    
    if(!this.selectedLayer)
      this.selectLayer(layer);

    // add to the end/top
    this.layers.push(layer);
  }

  selectLayer(layer)
  {
    layer.layerElement.classList.add("selected");

    if(this.selectedLayer)
      this.selectedLayer.layerElement.classList.remove("selected");
    
    this.selectedLayer = layer;
  }

  scale(width, height)
  {
    this.width = width;
    this.height = height;

    for(let layer of this.layers)
      layer.scale(width, height);

    this.render();
  }

  padLeft(length)
  {
    this.width = width + length;
    this.height = height;

    for(let layer of this.layers)
    {
      layer.padLeft(length);
      layer.render();
    }

    this.render();
  }

  padRight(length)
  {
    this.width = width + length;
    this.height = height;

    for(let layer of this.layers)
    {
      layer.padRight(length);
      layer.render();
    }

    this.render();
  }

  padTop(length)
  {
    this.width = width;
    this.height = height + length;

    for(let layer of this.layers)
    {
      layer.padTop(length);
      layer.render();
    }

    this.render();
  }

  padBottom(length)
  {
    this.width = width;
    this.height = height + length;

    for(let layer of this.layers)
    {
      layer.padBottom(length);
      layer.render();
    }

    this.render();
  }

  render()
  {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.canvas.width/2, this.canvas.height/2);
    this.ctx.scale(this.zoom, this.zoom);
    this.ctx.translate(this.x, this.y);
    this.ctx.translate(-this.width / 2, -this.height / 2);

    this.renderBackground();

    for(let layer of this.layers)
      this.ctx.drawImage(layer.canvas, 0, 0);

    this.ctx.restore();
  }

  renderBackground()
  {
    for(let y = 0; y < this.height; y += 16)
    {
      for(let x = 0; x < this.width; x += 16)
      {
        this.ctx.fillStyle = (x + y) % 32 == 0 ? "#ccc" : "#777";
        let width = Math.min(16, this.width - x);
        let height = Math.min(16, this.height - y);
        this.ctx.fillRect(x, y, width, height);
      }
    }
  }
}

class Layer
{
  constructor(width, height, colors)
  {
    this.pixels = [];
    this.colors = colors;
    this.width = width;
    this.height = height;

    this.canvas = document.createElement("canvas");
    this.canvas.className = "layer-preview";
    this.canvas.style.imageRendering = "pixelated";
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext("2d");

    this.layerElement = document.createElement("div");
    this.layerElement.className = "layer-tab";

    this.nameElement = document.createElement("span");
    this.nameElement.className = "name";
    this.nameElement.innerText = this.name;

    this.layerElement.appendChild(this.canvas);
    this.layerElement.appendChild(this.nameElement);

    this.clear();
  }

  get name()
  {
    return this.nameElement.innerText;
  }

  set name(value)
  {
    this.nameElement.innerText = value;
  }

  getPixel(x, y)
  {
    x = Math.floor(x);
    y = Math.floor(y);

    let row = this.pixels[x];

    // return an alpha colorIndex
    if(!row)
      return -1; 
    
    let colorIndex = row[y];

    // return alpha index if undefined
    // otherwise return the colorIndex
    return colorIndex ? colorIndex : -1;
  }

  setPixel(x, y, colorIndex)
  {
    x = Math.floor(x);
    y = Math.floor(y);

    if(x > -1 && x < this.width && y > -1 && y < this.height)
    {
      this.pixels[x][y] = colorIndex;

      // draw this pixel
      this.ctx.fillStyle = this.colors[colorIndex];
      this.ctx.fillRect(x, y, 1, 1);
    }
  }

  clear()
  {
    this.pixels = [];

    for(let x = 0; x < this.width; x++)
      this.pixels[x] = this.createPadding(this.height);
    
    // clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // todo
  scale(width, height)
  {
  }

  /** 
   * creates an array of alphaIndex using the
   * specified length
   * 
   * @param {number} length
   * @returns {number[]}
   */
  createPadding(length)
  {
    return [].fill(-1, 0, length);
  }

  padTop(size)
  {
    // we append values only so reusing an
    // array does not matter
    let padding = this.createPadding(size);

    // append padding to the start of each column
    for(let x = 0; x < this.width; x++)
      this.pixels.splice(0, 0, ...padding);

    this.canvas.height = this.height += size;
  }

  padBottom(size)
  {
    let padding = this.createPadding(size);

    for(let x = 0; x < this.width; x++)
    {
      let column = this.pixels[x];

      // append padding to the bottom of the column
      column.splice(column.length, 0, ...padding);
    }

    this.canvas.height = this.height += size;
  }

  padLeft(size)
  {
    for(let i = 0; i < size; i++)
      this.pixels.splice(0, 0, this.createPadding(this.height));
    
    this.canvas.width = this.width += size;
  }

  padRight(size)
  {
    for(let i = 0; i < size; i++)
      this.pixels.splice(this.pixels.length, 0, this.createPadding(this.height));
    
    this.canvas.width = this.width += size;
  }

  render()
  {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for(let x = 0; x < this.width; x++)
      for(let y = 0; y < this.height; y++)
      {
        let colorIndex = this.pixels[x][y];

        // alpha
        if(colorIndex == -1)
          continue;

        this.ctx.fillStyle = this.colors[colorIndex];
        this.ctx.fillRect(x, y, 1, 1);
      }
  }
}

class Tool
{
  constructor(spriteEditor)
  {
    this.spriteEditor = spriteEditor;

    this.iconContainer = document.createElement("span");
    this.iconContainer.className = "tool-icon-container";

    this.icon = document.createElement("span");
    this.icon.className = "tool-icon";
    this.icon.addEventListener("click", () => {
      spriteEditor.tool.icon.classList.remove("selected");
      this.icon.classList.add("selected");

      spriteEditor.tool = this;
    });

    this.iconContainer.appendChild(this.icon);
  }

  /**
   * function called when a mouse event occurs on the canvas
   * @param {string} name mousedown, mousemove, mouseup
   * @param {string} x x position of the mouse
   * @param {string} y y position of the mouse
   * @param {number} button -1 null, 0 left, 1 middle, 2 right
   */
  mouseEvent(name, x, y, button)
  {

  }
}

class Pencil extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("pencil");
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;
    
    let color = button == 0 ? this.spriteEditor.leftColor :
                              this.spriteEditor.rightColor;

    let colorIndex = this.spriteEditor.getColorIndex(color);
    this.spriteEditor.selectedLayer.setPixel(x, y, colorIndex);
    this.spriteEditor.render();
  }
}

class Eraser extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("pencil");
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;
    
    let color = button == 0 ? this.spriteEditor.leftColor :
                              this.spriteEditor.rightColor;

    let colorIndex = this.spriteEditor.getColorIndex(color);
    this.spriteEditor.selectedLayer.setPixel(x, y, colorIndex);
    this.spriteEditor.render();
  }
}