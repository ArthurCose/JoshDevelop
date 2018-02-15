import Editor from "../../src/server/Editor";
import SpriteFile from "./SpriteFile";
import path from "path";

export default class SpriteEditor extends Editor
{
  constructor(project, fileNode)
  {
    super("SpriteEditor", project, fileNode);
    this.sprite = new SpriteFile(fileNode);
  }

  static getSupportLevelFor(fileName)
  {
    let extension = path.extname(fileName);

    switch(extension) {
    case ".sprite":
      return 1;
    case ".png":
      return 2;
    default:
      return 0;
    }
  }

  addSession(session)
  {
    super.addSession(session);

    session.send({
      type: "editor",
      action: "join",
      editorId: session.editors.indexOf(this),
      width: this.sprite.width,
      height: this.sprite.height,
      layers: this.sprite.layers,
      animations: this.sprite.animations
    });
  }

  messageReceived(session, message)
  {
    super.messageReceived(session, message);

    switch(message.action) {
    case "scale":
      this.sprite.scale(message.width, message.height);

      this.broadcast(session, {
        type: "editor",
        action: "scale",
        width: message.width,
        height: message.height
      });
      break;
    case "pad":
      this.sprite.pad(message.size, message.direction);

      this.broadcast(session, {
        type: "editor",
        action: "pad",
        size: message.size,
        direction: message.direction
      });
      break;
    case "animation":
      this.sprite.modifyAnimation(message.name, message.start, message.end);

      this.broadcast(session, {
        type: "editor",
        action: "animation",
        name: message.name,
        start: message.start,
        end: message.end
      });
      break;
    case "delete animation":
      this.sprite.deleteAnimation(message.name);

      this.broadcast(session, {
        type: "editor",
        action: "delete animation",
        name: message.name
      });
      break;
    case "add layer":
      this.sprite.addLayer(message.name);

      this.broadcast(session, {
        type: "editor",
        action: "add layer",
        name: message.name
      });
      break;
    case "remove layer":
      this.sprite.removeLayer(message.name);

      this.broadcast(session, {
        type: "editor",
        action: "remove layer",
        name: message.name
      });
      break;
    case "rename layer":
      if(this.sprite.getLayer(message.newName)) {
        session.displayPopup(`Layer "${message.newName}" exists`);
        break;
      }

      this.sprite.renameLayer(message.oldName, message.newName);

      this.broadcast(session, {
        type: "editor",
        action: "rename layer",
        oldName: message.oldName,
        newName: message.newName
      });
    case "pencil":
      let layer = this.sprite.getLayer(message.layerName);

      // layer was deleted before edit could go through
      if(layer == undefined)
        return;

      layer.setPixel(message.x, message.y, message.color);

      this.broadcast(session, {
        type: "editor",
        action: "pencil",
        layerName: message.layerName,
        x: message.x,
        y: message.y,
        color: message.color
      });

      this.sprite.save();
      break;
    case "bucket":
      // todo

      this.broadcast(session, {
        type: "editor",
        action: "bucket",
        x: message.x,
        y: message.y,
        color: message.color
      });

      this.sprite.save();
      break;
    case "cursor":
      this.broadcast(session, {
        type: "editor",
        action: "cursor",
        x: message.x,
        y: message.y,
        userid: session.id
      });
      break;
    }
  }
}
