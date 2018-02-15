import Tool from "./Tool.js";
import Color from "../Color.js";

export default class EraserTool extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("eraser");
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;

    // transparent
    let color = new Color(0, 0, 0, 0);

    this.spriteEditor.session.send({
      type: "editor",
      action: "pencil",
      editorId: this.spriteEditor.id,
      layerName: this.spriteEditor.selectedLayer.name,
      x: x,
      y: y,
      color: color
    });

    this.spriteEditor.selectedLayer.setPixel(x, y, color);
    this.spriteEditor.render();
  }
}
