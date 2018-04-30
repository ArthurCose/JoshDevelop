export default class ToggleButton
{
  constructor(label, tooltip, selected)
  {
    this.element = document.createElement("span");
    this.element.className = "toggle-button";
    this.element.innerText = label;
    this.element.title = tooltip;

    if(selected)
      this.toggle();

    this.element.addEventListener("click", () => this.toggle());
  }

  get selected()
  {
    return this.element.classList.contains("selected");
  }

  toggle()
  {
    if(this.selected)
      this.element.classList.remove("selected");
    else
      this.element.classList.add("selected");
  }
}
