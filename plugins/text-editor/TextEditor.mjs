import TextDocument from "./TextDocument";
import {transformOperations} from "./public/OperationalTransform";
import Editor from "../../src/server/Editor";

export default class TextEditor extends Editor
{
  constructor(project, fileNode)
  {
    super("TextEditor", project, fileNode);
    this.document = new TextDocument(fileNode);
    this.selections = new Map();
  }

  static getSupportLevelFor(fileName)
  {
    // All files are third class
    return 3;
  }

  addSession(session)
  {
    super.addSession(session);

    let editorId = session.editorToId.get(this);

    session.send({
      type: "editor",
      action: "join",
      lastRevision: this.document.revisions.length,
      value: this.document.lines.join("\n"),
      path: this.fileNode.clientPath,
      editorId
    });

    for(let [userId, ranges] of this.selections) {
      session.send({
        type: "editor",
        action: "update selections",
        userId,
        ranges,
        editorId
      });
    }
  }

  removeSession(session)
  {
    super.removeSession(session);

    this.selections.delete(session.id);

    this.broadcast(session, {
      type: "editor",
      action: "remove selections",
      userId: session.id
    });
  }

  messageReceived(session, message)
  {
    super.messageReceived(session, message);

    switch(message.action) {
    case "operation":
      message.operation.skip = false;
      message.operation.owners = [session.id];

      this.applyOperations(session, [message.operation], message.lastRevision);
      break;
    case "update selections":
      this.selections.set(session.id, message.ranges);

      this.broadcast(session, {
        type: "editor",
        action: "update selections",
        userId: session.id,
        ranges: message.ranges
      });
      break;
    }
  }

  applyOperations(owner, operations, lastRevision)
  {
    operations = transformOperations(
      operations,
      this.document.revisions.slice(lastRevision, this.document.revisions.length)
    );

    for(let operation of operations) {
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
      editorId: owner.editorToId.get(this)
    };

    owner.send(message);

    // modify the message to update the other clients
    message.action = "operation";
    this.broadcast(owner, message);
  }
}
