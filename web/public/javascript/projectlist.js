class ProjectList
{
  constructor()
  {
    this.dropdown = this.initializeDropdown();
  }

  initializeDropdown()
  {
    let dropdown = session.toolbar.addDropDown("Projects");
    
    dropdown.addBreak("/list end");
    dropdown.addButton("New Project", () => {
      let menuElement = dropdown.contextMenu.element;
      let breakElement = menuElement.querySelector("hr");
      let input = document.createElement("input");

      input.addEventListener("change", () => {
        session.send({
          type: "project",
          action: "add",
          name: input.value
        });
        dropdown.hide();
      })
      input.addEventListener("blur", () => {
        dropdown.hide();
      });

      menuElement.insertBefore(input, breakElement);
      input.focus();
    }, false);

    return dropdown;
  }
  
  addProject(projectName)
  {
    this.dropdown.addButtonBefore(
      "/list end",
      projectName,
      () => session.swapProject(projectName)
    );
  }

  removeProject(projectName)
  {
    this.dropdown.removeElement(projectName);
  }

  messageReceived(message)
  {
    switch(message.action)
    {
    case "swap":
      session.setProject(message.name);
      break;
    case "add":
      this.addProject(message.name);
      break;
    case "remove":
      this.removeProject(message.name);
      break;
    }
  }
}