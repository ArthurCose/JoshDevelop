const TextEditor = require("./TextEditor");
const Plugin = require("../../core/Plugin");

class TextEditorPlugin extends Plugin
{
  constructor()
  {
    super();
    // any editors that this plugin has created
    this.editors = [TextEditor];
    
    // the directory used to serve content from.
    // relative to the plugin root
    this.publicPath = "public";

    // paths relative to the public path, will be converted to: plugins/TextEditor/scriptname.js
    this.localScripts = ["init.js", "caret.js", "editor.js", "basicEditor.js", "settings.js", "operationaltransform.js"];
    this.stylesheets = ["texteditor.css"];
    // external scripts from dependencies, requires extra routing
    this.externalScripts = ["ace/ace.js", "ace/ext-modelist.js", "ace/ext-themelist.js"];

    // handle extra routing needed due to dependencies
    // ace in this case
    this.extraRouting = (express, app) => {
      app.use("/ace", express.static("node_modules/ace-builds/src-min-noconflict"));
    }
  }
}

module.exports = new TextEditorPlugin();