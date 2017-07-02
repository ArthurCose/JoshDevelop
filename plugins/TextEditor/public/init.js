session.on("load", () => {
  modelist = ace.require("ace/ext/modelist");
  session.settings.addSection(new AceSettings());
  session.editorDictionary["TextEditor"] = TextEditor;
});