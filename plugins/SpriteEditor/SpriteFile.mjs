import Animation from "./Animation";
import Layer from "./Layer";
import path from "path";
import fs from "fs-extra";
import pngjs from "pngjs"

const PNG = pngjs.PNG;

export default class SpriteFile
{
  constructor(fileNode)
  {
    this.fileNode = fileNode;
    this.extension = path.extname(fileNode.name);
    this.width = 32;
    this.height = 32;

    this.animations = {};
    this.layers = [];

    this.open();
    this.saveQueued = false;
    this.saving = false;
  }

  open()
  {
    switch(this.extension) {
    case ".sprite":
      this.addLayer("Layer 1");
      break;
    case ".png":
      let data = fs.readFileSync(this.fileNode.serverPath);
      let png = data.length == 0 ? new PNG({width: 32, height: 32})
                                 : PNG.sync.read(data);

      this.width = png.width;
      this.height = png.height;

      let layer = this.addLayer("Layer 1");
      layer.data = new Uint8ClampedArray(png.data);
      break;
    }
  }

  async save()
  {
    // don't try to save while already saving
    if(this.saving) {
      // queue a new save for after
      // the current save is finished
      this.saveQueued = true;
      return;
    }

    this.saving = true;

    await this.fileNode.parentFolder.make();

    switch(this.extension) {
    case ".sprite":
      break
    case ".png":
      this.saveAsPNG();
      break;
    }

    if(this.saveQueued)
      this.save();

    this.saving = false;
  }

  saveAsPNG()
  {
    let buffer = Buffer.from(this.layers[0].data);

    let png = new PNG({
      width: this.width,
      height: this.height,
      data: buffer
    });

    png.data = buffer;

    png.pack()
       .pipe(fs.createWriteStream(this.fileNode.serverPath))
       .on("finish", () => {
         this.saving = false;

         // save again
         if(this.saveQueued)
           this.save();

         this.saveQueued = false;
       });
  }

  modifyAnimation(name, start, end)
  {
    let animation = this.animations[name];

    if(animation == undefined) {
      animation = new Animation(name, start, end);
      this.animations[name] = animation;
    }
    else {
      animation.start = start;
      animation.end = end;
    }

    if(this.extension == ".sprite")
      this.save();
  }

  deleteAnimation(name)
  {
    delete this.animations[name];

    if(this.extension == ".sprite")
      this.save();
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

    this.layers.push(layer);

    if(this.extension == ".sprite")
      this.save();

    return layer;
  }

  removeLayer(name)
  {
    let layer = this.getLayer(name);
    let index = this.layers.indexOf(layer);

    delete this.layers[index];

    if(this.extension == ".sprite")
      this.save();
  }

  renameLayer(oldName, newName)
  {
    this.getLayer(oldName).name = newName;
  }

  scale(width, height)
  {
    this.width = width;
    this.height = height;

    for(let layer of this.layers)
      layer.scale(width, height);

    this.save();
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

    this.save();
  }

  padLeft(size)
  {
    this.width = width + size;
    this.height = height;

    for(let layer of this.layers)
      layer.padLeft(size);

    this.save();
  }

  padRight(size)
  {
    this.width = width + size;
    this.height = height;

    for(let layer of this.layers)
      layer.padRight(size);

    this.save();
  }

  padTop(size)
  {
    this.width = width;
    this.height = height + size;

    for(let layer of this.layers)
      layer.padTop(size);
  }

  padBottom(size)
  {
    this.width = width;
    this.height = height + size;

    for(let layer of this.layers)
      layer.padBottom(size);

    this.save();
  }
}
