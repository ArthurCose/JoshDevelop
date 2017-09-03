const Plugin = require("../../core/Plugin");
const SpriteEditor = require("./SpriteEditor");

class SpriteEditorPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.editors = [SpriteEditor];
    this.localScripts = ["init.js", "editor.js"];
    this.stylesheets = ["editor.css"];
  }
}

module.exports = SpriteEditorPlugin;