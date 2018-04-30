import AceSettings from "./AceSettings.js";
import TextEditor from "./TextEditor.js";

export default function main(session)
{
  session.on("connect", () => {
    session.settingsMenu.addSection(new AceSettings(session));
    session.editorDictionary.set("TextEditor", TextEditor);
  });
}
