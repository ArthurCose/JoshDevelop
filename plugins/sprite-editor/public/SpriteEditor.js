import Color from "./Color.js";
import Layer from "./Layer.js";
import DropperTool from "./tools/DropperTool.js";
import EraserTool from "./tools/EraserTool.js";
import MoveTool from "./tools/MoveTool.js";
import PencilTool from "./tools/PencilTool.js";
import Editor from "/javascript/client/Editor.js";
import {VSplit, HSplit} from "/javascript/client/Splitter.js";

export default class SpriteEditor extends Editor
{
  constructor(id, fileNode, tab, session)
  {
    super(id, fileNode, tab, session);
    this.element.classList.add("sprite-editor");

    this.width = 32;
    this.height = 32;
    this.layers = [];
    this.selectedLayer;
    this.selection;
    this.tool = new PencilTool(this);

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
    this.leftColor = new Color(0, 0, 0, 0);

    this.rightColorElement = this.createColorElement();
    this.selectedColorsElement.appendChild(this.rightColorElement);
    this.rightColor = new Color(255, 255, 255, 255);

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

    this.toolsElement.appendChild(this.tool.icon);
    this.toolsElement.appendChild(new EraserTool(this).icon);
    this.toolsElement.appendChild(new MoveTool(this).icon);
    this.toolsElement.appendChild(new DropperTool(this).icon);

    this.tool.icon.classList.add("selected");

    // layers
    this.layersElement = document.createElement("div");
    this.layersElement.className = "layers";
    this.layersElement.innerHTML = "Layers: <br />";
    let hsplit = new HSplit(this.toolsElement, this.layersElement);


    tab.on("resize", () => this.canvasResized());
    tab.on("active", () => this.canvasResized());
  }

  get leftColor()
  {
    let value = this.leftColorElement.value;

    return Color.fromInputHex(value);
  }

  get rightColor()
  {
    let value = this.rightColorElement.value;

    return Color.fromInputHex(value);
  }

  set leftColor(color)
  {
    this.leftColorElement.value = color.toInputHex();
  }

  set rightColor(color)
  {
    this.rightColorElement.value = color.toInputHex();
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

      if(mouseButton == 1) {
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

  getLayer(name)
  {
    for(let layer of this.layers)
      if(layer.name == name)
        return layer;
  }

  addLayer(name)
  {
    let layer = new Layer(name, this.width, this.height);

    layer.layerElement.addEventListener("click", () => this.selectLayer(layer));

    let lastLayer = this.layers[this.layers.length - 1];

    this.layersElement.insertBefore(layer.layerElement, lastLayer ? lastLayer.layerElement : undefined);

    if(!this.selectedLayer)
      this.selectLayer(layer);

    // add to the end/top
    this.layers.push(layer);

    return layer;
  }

  removeLayer(name)
  {
    let layer = this.getLayer(name);
    let index = this.layers.indexOf(layer);

    layer.layerElement.remove();

    delete this.layers[index];
  }

  selectLayer(layer)
  {
    layer.layerElement.classList.add("selected");

    if(this.selectedLayer)
      this.selectedLayer.layerElement.classList.remove("selected");

    this.selectedLayer = layer;
  }

  modifyAnimation(name, start, end)
  {
    let animation = this.animations[name];

    animation.start = start;
    animation.end = end;
  }

  deleteAnimation(name)
  {
    delete this.animations[name];
  }

  scale(width, height)
  {
    this.width = width;
    this.height = height;

    for(let layer of this.layers)
      layer.scale(width, height);

    this.render();
  }

  pad(size, direction)
  {
    switch(direction) {
    case "left":
      this.padLeft(size);
      break;
    case "right":
      this.padRight(size);
      break;
    case "top":
      this.padTop(size);
      break;
    case "bottom":
      this.padBottom(size);
      break;
    }
  }

  padLeft(size)
  {
    this.width += size;

    for(let layer of this.layers) {
      layer.padLeft(size);
      layer.render();
    }

    this.render();
  }

  padRight(size)
  {
    this.width += size;

    for(let layer of this.layers) {
      layer.padRight(size);
      layer.render();
    }

    this.render();
  }

  padTop(size)
  {
    this.height += size;

    for(let layer of this.layers) {
      layer.padTop(size);
      layer.render();
    }

    this.render();
  }

  padBottom(size)
  {
    this.height += size;

    for(let layer of this.layers) {
      layer.padBottom(size);
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
    for(let y = 0; y < this.height; y += 16) {
      for(let x = 0; x < this.width; x += 16) {
        this.ctx.fillStyle = (x + y) % 32 == 0 ? "#ccc" : "#777";
        let width = Math.min(16, this.width - x);
        let height = Math.min(16, this.height - y);
        this.ctx.fillRect(x, y, width, height);
      }
    }
  }

  loadSprite(message)
  {
    this.width = message.width;
    this.height = message.height;

    for(let layerData of message.layers) {
      let layer = this.addLayer(layerData.name);
      let dataArray = Object.values(layerData.data);

      layer.data = new Uint8ClampedArray(dataArray);
      layer.render();
    }

    for(let animationName in message.animations) {
      let animation = message.animations[animationName];

      this.modifyAnimation(animation.name, animation.startFrame, animation.endFrame);
    }
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "join":
      this.loadSprite(message);
      break;
    case "scale":
      this.scale(message.width, message.height);
      break;
    case "pad":
      this.pad(message.size, message.direction);
      break;
    case "animation":
      this.modifyAnimation(message.name, message.start, message.end);
      break;
    case "delete animation":
      this.deleteAnimation(message.name);
      break;
    case "add layer":
      this.addLayer(message.name);
      break;
    case "remove layer":
      this.removeLayer(message.name);
      break;
    case "pencil":
      let layer = this.getLayer(message.layerName);

      // layer was deleted before edit could go through
      if(layer == undefined)
        return;

      let color = Color.fromObject(message.color);
      layer.setPixel(message.x, message.y, color);
      break;
    case "bucket":
      // todo
      break;
    case "cursor":
      // todo
      break;
    }

    this.render();
  }
}

