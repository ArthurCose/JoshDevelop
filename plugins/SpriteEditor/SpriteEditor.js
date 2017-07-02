const Editor = require("../../core/Editor.js");
const SpriteFile = require("./SpriteFile.js");
const path = require("path");

class SpriteEditor extends Editor
{
  constructor(core, fileNode)
  {
    super("SpriteEditor", core, fileNode);
    this.sprite = new SpriteFile(fileNode);
  }
  
  static getSupportLevelFor(fileName)
  {
    // support file with the sprite extension
    return path.extname(fileName) == ".sprite" ? 2 : 0;
  }
}

module.exports = SpriteEditor;