session.on("connect", () => {
  session.editorDictionary["SpriteEditor"] = SpriteEditor;
});