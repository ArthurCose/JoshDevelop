export default class Tool
{
  constructor(spriteEditor)
  {
    this.spriteEditor = spriteEditor;

    this.icon = document.createElement("span");
    this.icon.className = "tool-icon";
    this.icon.addEventListener("click", () => {
      spriteEditor.tool.icon.classList.remove("selected");
      this.icon.classList.add("selected");

      spriteEditor.tool = this;
    });
  }

  /**
   * function called when a mouse event occurs on the canvas
   * @param {string} name mousedown, mousemove, mouseup
   * @param {number} x x position of the mouse
   * @param {number} y y position of the mouse
   * @param {number} button -1 null, 0 left, 1 middle, 2 right
   */
  mouseEvent(name, x, y, button)
  {

  }
}
