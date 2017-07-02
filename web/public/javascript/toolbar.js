class Toolbar
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
    this.buttons = [];
    this.buttonDictionary = {};
    this.contextMenu = undefined;
  }

  addButton(label, clickDelegate)
  {
    if(label in this.buttonDictionary)
      throw `button ${label} already exists.`;

    let button = {
      label: label,
      clickDelegate: clickDelegate
    };

    this.buttons.push(button);
    this.buttonDictionary[label] = button;
  }

  addButtonBefore(beforeLabel, label, clickDelegate)
  {
    if(label in this.buttonDictionary)
      throw `button ${label} already exists.`;
    
    let insertIndex = this.indexOf(beforeLabel);

    // create the button
    let button = {
      label: label,
      clickDelegate: clickDelegate
    };
    
    this.buttons.splice(insertIndex, 0, button);
    this.buttonDictionary[label] = button;
  }

  addButtonAfter(afterLabel, label, clickDelegate)
  {
    if(label in this.buttonDictionary)
      throw `button ${label} already exists.`;
    
    let insertIndex = this.indexOf(afterLabel) + 1;
    
    // create the button
    let button = {
      label: label,
      clickDelegate: clickDelegate
    };

    this.buttons.splice(insertIndex, 0, button);
    this.buttonDictionary[label] = button;
  }

  indexOf(label)
  {
    for(var i = 0; i < this.buttons.length; i++)
      if(this.buttons[i].label == label)
        return i;
  }

  removeButton(label)
  {
    let button = this.buttonDictionary[label];
    let index = this.buttons.indexOf(button);

    this.buttons.splice(index, 1);
    delete this.buttonDictionary[label];
  }

  show(x, y)
  {
    let menu = new ContextMenu(x, y);

    for(let button of this.buttons)
      menu.addButton(button.label, button.clickDelegate);
    
    menu.appendToElement(document.body);
  }

  hide()
  {
    if(this.contextMenu)
      this.contextMenu.destroy();
    
    this.contextMenu = undefined;
  }
}