session.on("connect", () => {
  modelist = ace.require("ace/ext/modelist");
  session.settingsMenu.addSection(new AceSettings());
  session.editorDictionary["TextEditor"] = TextEditor;
});