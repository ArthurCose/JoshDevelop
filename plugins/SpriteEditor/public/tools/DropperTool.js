import Tool from "./Tool.js"

export default class DropperTool extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("dropper");
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;

    let color = this.spriteEditor.selectedLayer.getPixel(x, y);

    if(button == 0)
      this.spriteEditor.leftColor = color;
    else
      this.spriteEditor.rightColor = color;
  }
}
