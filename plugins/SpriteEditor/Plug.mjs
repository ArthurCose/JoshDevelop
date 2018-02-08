import Plugin from "../../src/server/Plugin";
import SpriteEditor from "./SpriteEditor";

export default class SpriteEditorPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.editors = [SpriteEditor];
    this.clientEntry = "Entry.js";
    this.stylesheets = ["stylesheets/editor.css"];
  }
}
