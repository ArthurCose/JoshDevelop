import BasicTextEditor from "./BasicTextEditor.js"
import {transformOperations} from "./OperationalTransform.mjs";
import Editor from "/javascript/client/Editor.js"

let Range = ace.require("ace/range").Range;
let modelist = ace.require("ace/ext/modelist");

export default class TextEditor extends Editor
{
  constructor(id, fileNode, tab, session)
  {
    super(id, fileNode, tab, session);

    // hide until document is ready
    this.element.style.display = "none";

    this.lastRevision = 0;
    this.awaitingOperations = [];
    this.writingData = false;

    this.editor = this.createEditor();
    this.editor.aceEditor.on("change", (operation) => this.changeMade(operation));
    this.editor.updateHighlighter(fileNode.name);

    this.editor.selection.on("changeCursor", () => this.sendCaretUpdate());
    this.editor.selection.on("changeSelection", () => this.sendCaretUpdate());

    tab.on("active", () => {
      this.editor.aceEditor.focus();
      this.editor.caret.redraw();
    });
  }

  createEditor()
  {
    let editorElement = document.createElement("div");

    // create text editor
    let editor = new BasicTextEditor(editorElement, this.session);

    this.tab.on("resize", (eventName) => editor.aceEditor.resize(true));
    this.element.appendChild(editorElement);

    return editor;
  }

  renamed()
  {
    this.editor.updateHighlighter(this.fileNode.name);
    super.renamed();
  }

  closed()
  {
    // preventing memory leak
    this.editor.destroy();

    super.closed();
  }

  sendCaretUpdate()
  {
    let range = this.editor.selection.getRange();

    this.session.send({
      type:"editor",
      action: "update caret",
      editorId: this.id,
      range: range
    });
  }

  changeMade(operation)
  {
    // writing data from server
    if(this.writingData)
      return;

    this.session.send({
      type:"editor",
      action: "operation",
      path: this.fileNode.clientPath,
      lastRevision: this.lastRevision,
      operation: operation,
      editorId: this.id
    });

    operation.owners = [this.session.id];
    operation.skip = false;

    this.awaitingOperations.push(operation);
  }

  messageReceived(message)
  {
    this.writingData = true;

    switch(message.action) {
    case "join":
      this.editor.aceEditor.setValue(message.value, -1);
      this.editor.clearHistory();

      this.element.style.display = "";
      this.lastRevision = message.lastRevision;
      break;
    case "operation":
      this.writingData = true;
      this.applyOperations(message.operations);
      this.writingData = false;

      this.lastRevision = message.lastRevision;
      break;
    case "ack":
      this.awaitingOperations.shift();

      this.lastRevision = message.lastRevision;
      break;
    case "add caret":
      let caret = this.editor.addCaret(message.userid);

      caret.updatePosition(message.range);
      break;
    case "update caret":
      this.editor.carets[message.userid].updatePosition(message.range);
      break;
    case "remove caret":
      this.editor.carets[message.userid].destroy();
      this.editor.carets[message.userid] = undefined;
      break;
    }

    this.writingData = false;
  }

  applyOperations(operations)
  {
    operations = transformOperations(operations, this.awaitingOperations);

    for(let operation of operations)
      if(!operation.skip)
        this.applyOperation(operation);
  }

  applyOperation(operation)
  {
    switch(operation.action) {
    case "insert":
      this.insert(operation);
      break;
    case "remove":
      this.remove(operation);
      break;
    }
  }

  insert(operation)
  {
    this.editor.aceEditor.session.insert(operation.start, operation.lines.join("\n"));
  }

  remove(operation)
  {
    this.editor.aceEditor.session.remove(operation);
  }
}
