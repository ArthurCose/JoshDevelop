import Tool from "./Tool.js"

export default class MoveTool extends Tool
{
  constructor(spriteEditor)
  {
    super(spriteEditor);
    this.icon.classList.add("move");

    this.lastX = 0;
    this.lastY = 0;
  }

  mouseEvent(name, x, y, button)
  {
    if(name == "mouseup")
      return;
    if(button == -1 || button == 1)
      return;

    if(name == "mousedown") {
      this.lastX = x;
      this.lastY = y;
    }

    this.spriteEditor.x += x - this.lastX;
    this.spriteEditor.y += y - this.lastY;
    this.spriteEditor.render();
  }
}
