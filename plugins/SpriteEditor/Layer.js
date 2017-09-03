const Color = require("./Color.js");

class Layer
{
  constructor(name, width, height)
  {
    this.name = name;
    this.width = width;
    this.height = height;
    
    this.data = new Uint8ClampedArray(this.width * this.height * 4);
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
}

module.exports = Layer;