import SpriteEditor from "./SpriteEditor.js";

export default function main(session)
{
  session.on("connect", () => {
    session.editorDictionary.set("SpriteEditor", SpriteEditor);
  });
}