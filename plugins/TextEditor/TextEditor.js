"use strict";

const OperationTransformer = require('./public/operationaltransform');
const TextDocument = require("./TextDocument");
const Editor = require("../../core/Editor");

class TextEditor extends Editor
{
  constructor(core, fileNode)
  {
    super("TextEditor", core, fileNode);
    this.document = new TextDocument(fileNode);
    this.carets = [];
  }
  
  static getSupportLevelFor(fileName)
  {
    // All files are third class
    return 3;
  }
  
  addSession(session)
  {
    super.addSession(session);
    
    let editorId = session.editors.indexOf(this);

    session.send({
      type: "editor",
      action: "join",
      lastRevision: this.document.revisions.length,
      value: this.document.lines.join("\n"),
      path: this.fileNode.clientPath,
      editorId: editorId
    });

    for(let key in this.carets)
    {
      let caretRange = this.carets[key];

      if(caretRange == undefined)
        continue;

      session.send({
        type: "editor",
        action: "addCaret",
        range: caretRange,
        userid: key,
        editorId: editorId
      });
    }
    
    let range = {
      start: { row: 0, column: 0 },
      end: { row: 0, column: 0 }
    };

    this.carets[session.id] = range;

    this.broadcast(session, {
      type: "editor",
      action: "addCaret",
      range: range,
      userid: session.id
    });
  }
  
  removeSession(session)
  {
    super.removeSession(session);
    
    this.carets[session.id] = undefined;

    this.broadcast(session, {
      type: "editor",
      action: "removeCaret",
      userid: session.id
    });
  }
    
  messageReceived(session, message)
  {
    super.messageReceived(session, message);
    
    switch(message.action)
    {
    case "operation":
      message.operation.skip = false;
      message.operation.owners = [session.id];
      
      this.applyOperations(session, [message.operation], message.lastRevision);

      break;
    case "updateCaret":
      this.carets[session.id] = message.range;

      this.broadcast(session, {
        type: "editor",
        action: "updateCaret",
        range: message.range,
        userid: session.id
      });
      break;
    }
  }
  
  applyOperations(owner, operations, lastRevision)
  {
    operations = OperationTransformer.transformOperations(
      operations,
      this.document.revisions.slice(lastRevision, this.document.revisions.length)
    );
    
    for(let operation of operations)
    {
      if(!operation.skip)
        this.document.applyOperation(operation);
      else
        // save this operation as a revision
        this.document.revisions.push(operation);
    }
    
    // save to disk
    this.document.save();

    // tell the client we've received their operation to update their revision number
    let message = {
      type:"editor",
      action: "ack",
      lastRevision: this.document.revisions.length,
      operations: operations,
      path: this.fileNode.clientPath,
      editorId: owner.editors.indexOf(this)
    };
    
    owner.send(message);
    
    // modify the message to update the other clients
    message.action = "operation";
    this.broadcast(owner, message);
  }
}

module.exports = TextEditor;