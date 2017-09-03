const Plugin = require("../../core/Plugin");
const TextEditor = require("./TextEditor");

class TextEditorPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);

    this.editors = [TextEditor];

    this.publicPath = "public";

    this.localScripts = ["init.js", "caret.js", "editor.js", "basicEditor.js", "settings.js", "operationaltransform.js"];
    this.stylesheets = ["texteditor.css"];

    this.externalScripts = ["ace/ace.js", "ace/ext-modelist.js", "ace/ext-themelist.js"];
  }

  addStaticRoutes(express, app)
  {
    app.use("/ace", express.static("node_modules/ace-builds/src-min-noconflict"));
  }
}

module.exports = TextEditorPlugin;