session.on("load", () => {
  //session.settings.addSection(new SpriteEditorSettings());
  session.editorDictionary["SpriteEditor"] = SpriteEditor;
});