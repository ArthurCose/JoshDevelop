import Tool from "./Tool.js"

export default class PencilTool extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("pencil");
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;

    let color = button == 0 ? this.spriteEditor.leftColor :
                              this.spriteEditor.rightColor;

    // no need to update if the pixel we want to modify will stay the same
    if(this.spriteEditor.selectedLayer.getPixel(x, y) == color)
      return;

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
