import Plugin from "../../src/server/Plugin";
import TextEditor from "./TextEditor";

export default class TextEditorPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);

    this.editors = [TextEditor];

    this.publicPath = "public";

    this.clientEntry = "Entry.js";
    this.stylesheets = ["stylesheets/texteditor.css"];

    this.externalScripts = ["ace/ace.js", "ace/ext-modelist.js", "ace/ext-themelist.js"];
  }

  addStaticRoutes(server)
  {
    server.addStaticRoute(
      "/ace",
      "plugins/text-editor/node_modules/ace-builds/src-min-noconflict"
    );
  }
}
