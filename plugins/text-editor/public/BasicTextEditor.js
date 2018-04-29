import Selection from "./Selection.js";

let modelist = ace.require("ace/ext/modelist");

export default class BasicTextEditor
{
  constructor(element, session)
  {
    this.element = element;
    this.element.className = "ace-editor-container"

    this.session = session;

    this.aceEditor = this.createEditor();

    this.selections = new Map();

    this.infoBar = this.createInfoBar();
    this.selectionInfo = this.createSelectionInfo();
    this.updateSelectionInfo();

    this.selection = this.aceEditor.getSelection();
    this.selection.on("changeCursor", () => this.updateSelectionInfo());
    this.selection.on("changeCursor", () => this.updateSelections());
    this.selection.on("changeSelection", () => this.updateSelections());
  }

  createEditor()
  {
    let editorElement = document.createElement("div");

    // create text editor
    let aceEditor = ace.edit(editorElement);
    aceEditor.$blockScrolling = Infinity;
    aceEditor.session.selection.clearSelection();

    let settings = this.session.settingsMenu.sections["Text Editor"];
    settings.subscribeEditor(aceEditor);

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

  createSelectionInfo()
  {
    let selectionInfoElement = document.createElement("span");
    selectionInfoElement.className = "selection-info";

    this.infoBar.appendChild(selectionInfoElement);

    return selectionInfoElement;
  }

  setSelections(userId, ranges)
  {
    this.removeSelections(userId);

    let selections = [];

    for(let range of ranges) {
      let selection = new Selection(userId, range, this.aceEditor, this.session);

      if(userId == this.session.id && range.isEmpty())
        selection.enableBlink();

      selections.push(selection);
    }

    this.selections.set(userId, selections);
  }

  removeSelections(userId) {
    let selections = this.selections.get(userId);

    if(!selections)
      return;

    for(let selection of selections) {
      selection.destroy();
    }

    this.selections.delete(userId);
  }

  updateSelections()
  {
    let ranges = this.selection.getAllRanges();

    this.setSelections(this.session.id, ranges);
  }

  updateHighlighter(path)
  {
    let mode = modelist.getModeForPath(path).mode;
    this.aceEditor.session.setMode(mode);
  }

  updateSelectionInfo()
  {
    let pos = this.aceEditor.getCursorPosition();
    this.selectionInfo.innerText = `Ln ${pos.row + 1}, Col ${pos.column + 1}`;
  }

  clearHistory()
  {
    this.aceEditor.session.setUndoManager(new ace.UndoManager());
  }

  destroy()
  {
    for(let [userId] of this.selections) {
      this.removeSelections(userId);
    }

    let settings = this.session.settingsMenu.sections["Text Editor"];
    settings.unsubscribeEditor(this.aceEditor);

    this.aceEditor.destroy();
  }
}
