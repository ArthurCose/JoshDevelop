import ContextMenu from "./ContextMenu.js";

export default class Toolbar
{
  constructor()
  {
    this.element = document.getElementById("toolbar");
    this.leftElement = this.element.querySelector(".left");
  }

  addButton(label, clickDelegate)
  {
    let button = document.createElement("button");
    button.innerText = label;
    button.addEventListener("click", clickDelegate);

    this.leftElement.appendChild(button);

    return button;
  }

  addDropDown(label)
  {
    let dropdown = new DropDownMenu();

    let button = this.addButton(label, () => {
      let top = this.element.getBoundingClientRect().bottom;
      let left = button.getBoundingClientRect().left;
      dropdown.show(left, top);
    });

    return dropdown;
  }
}

class DropDownMenu
{
  constructor()
  {
    this.elements = [];
    this.contextMenu = undefined;
  }

  // label is used to identify the break
  // it serves no other purpose
  addBreak(label)
  {
    this.elements.push({
      type: "break",
      label: label
    });
  }

  addButton(label, clickDelegate, destroy)
  {
    let button = {
      type: "button",
      label: label,
      clickDelegate: clickDelegate,
      destroy: destroy
    };

    this.elements.push(button);
  }

  // identifier is the label or the index of the item
  // that we want to add the new button before
  addButtonBefore(identifier, label, clickDelegate, destroy)
  {
    let insertIndex = typeof identifier == "string" ?
                      this.indexOf(identifier) : identifier;

    // create the button
    let button = {
      type: "button",
      label: label,
      clickDelegate: clickDelegate,
      destroy: destroy
    };

    this.elements.splice(insertIndex, 0, button);
  }

  // identifier is the label or the index of the item
  // that we want to add the new button before
  addButtonAfter(identifier, label, clickDelegate, destroy)
  {
    let insertIndex = typeof identifier == "string" ?
                      this.indexOf(identifier) + 1 : identifier + 1;

    // create the button
    let button = {
      type: "button",
      label: label,
      clickDelegate: clickDelegate,
      destroy: destroy
    };

    this.elements.splice(insertIndex, 0, button);
  }

  indexOf(label)
  {
    for(let i = 0; i < this.elements.length; i++) {
      let element = this.elements[i];

      if(element.label == label)
        return i;
    }
  }

  removeElement(label)
  {
    let index = this.indexOf(label);

    this.elements.splice(index, 1);
  }

  show(x, y)
  {
    this.contextMenu = new ContextMenu(x, y);

    for(let element of this.elements) {
      if(element.type == "button")
        this.contextMenu.addButton(element.label, element.clickDelegate, element.destroy);
      else if(element.type == "break")
        this.contextMenu.addBreak();
    }

    this.contextMenu.appendToElement(document.body);
  }

  hide()
  {
    if(this.contextMenu)
      this.contextMenu.destroy();

    this.contextMenu = undefined;
  }
}
