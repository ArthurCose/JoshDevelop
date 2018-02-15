import Caret from "./Caret.js";

let modelist = ace.require("ace/ext/modelist");

export default class BasicTextEditor
{
  constructor(element, session)
  {
    this.element = element;
    this.element.className = "ace-editor-container"

    this.session = session;

    this.aceEditor = this.createEditor();

    this.carets = {};
    this.caret = this.addCaret(session.id);
    this.caret.enableBlink();

    this.infoBar = this.createInfoBar();
    this.caretInfo = this.createCaretInfo();
    this.updateCaretInfo();

    this.selection = this.aceEditor.getSelection();
    this.selection.on("changeCursor", () => this.updateCaretInfo());
    this.selection.on("changeCursor", () => this.updateCaret());
    this.selection.on("changeSelection", () => this.updateCaret());
  }

  createEditor()
  {
    let editorElement = document.createElement("div");

    // create text editor
    let aceEditor = ace.edit(editorElement);
    aceEditor.$blockScrolling = Infinity;
    aceEditor.session.selection.clearSelection();
    this.session.settingsMenu.sections["Text Editor"].applySettings(aceEditor);

    this.element.appendChild(editorElement);

    return aceEditor;
  }

  createInfoBar()
  {
    let bar = document.createElement("div");
    bar.className = "bottom-bar";

    this.element.appendChild(bar);

    return bar;
  }

  createCaretInfo()
  {
    let caretInfoElement = document.createElement("span");
    caretInfoElement.className = "caret-info";

    this.infoBar.appendChild(caretInfoElement);

    return caretInfoElement;
  }

  addCaret(userid)
  {
    let caret = new Caret(userid, this.aceEditor, this.session);

    this.carets[userid] = caret;

    return caret;
  }

  updateCaret()
  {
    let range = this.selection.getRange();

    this.caret.updatePosition(range);
  }

  updateHighlighter(path)
  {
    let mode = modelist.getModeForPath(path).mode;
    this.aceEditor.session.setMode(mode);
  }

  updateCaretInfo()
  {
    let pos = this.aceEditor.getCursorPosition();
    this.caretInfo.innerText = `Ln ${pos.row + 1}, Col ${pos.column + 1}`;
  }

  destroy()
  {
    this.aceEditor.destroy();

    for(let userid in this.carets) {
      let caret = this.carets[userid];

      if(caret)
        caret.destroy();
    }
  }
}
