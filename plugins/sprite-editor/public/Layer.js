import Color from "./Color.js";

export default class Layer
{
  constructor(name, width, height)
  {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(this.width * this.height * 4);

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
    this.nameElement.innerText = name;

    this.layerElement.appendChild(this.canvas);
    this.layerElement.appendChild(this.nameElement);
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

    let color = new Color(0, 0, 0, 0);
    let idx = (y * this.width + x) * 4;

    // return transparent
    if(idx > this.data.length)
      return color;

    color.r = this.data[idx];
    color.g = this.data[idx + 1];
    color.b = this.data[idx + 2];
    color.a = this.data[idx + 3];

    return color;
  }

  setPixel(x, y, color)
  {
    x = Math.floor(x);
    y = Math.floor(y);

    let idx = (y * this.width + x) * 4;

    if(idx > this.data.length)
      return;

    this.data[idx] = color.r;
    this.data[idx + 1] = color.g;
    this.data[idx + 2] = color.b;
    this.data[idx + 3] = color.a;

    this.ctx.fillStyle = color.toRGBAString();

    this.ctx.clearRect(x, y, 1, 1);
    this.ctx.fillRect(x, y, 1, 1);
  }

  clear()
  {
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
  }

  // todo
  scale(width, height)
  {
  }

  padTop(size)
  {
    this.height += size;

    // copy
    let oldData = this.data;

    // clear to resize
    this.clear();

    // place old data
    this.data.set(oldData, size * width * 4);
  }

  padBottom(size)
  {
    this.height += size;

    let oldData = this.data;
    this.clear();
    this.data.set(oldData, 0);
  }

  padLeft(size)
  {
    this.width += size;

    let oldData = this.data;
    this.clear();

    for(let i = 0; i < size; i++) {
      let idx = i * this.width * 4;
      let row = oldData.subarray(idx, idx + this.width * 4);

      this.data.set(row, idx);
    }
  }

  padRight(size)
  {
    this.width += size;

    let oldData = this.data;
    this.clear();

    for(let i = 1; i <= size; i++) {
      let idx = i * this.width * 4;
      let row = oldData.subarray(idx, idx + this.width * 4);

      this.data.set(row, idx);
    }
  }

  render()
  {
    let imageData = new ImageData(this.data, this.width, this.height);
    this.ctx.putImageData(imageData, 0, 0);
  }
}
