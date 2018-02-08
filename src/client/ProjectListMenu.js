export default class ProjectListMenu
{
  constructor(session)
  {
    this.session = session;
    this.dropdown = this.initializeDropdown();
  }

  initializeDropdown()
  {
    let dropdown = this.session.toolbar.addDropDown("Projects");

    dropdown.addBreak("/list end");
    dropdown.addButton("New Project", () => {
      let menuElement = dropdown.contextMenu.element;
      let breakElement = menuElement.querySelector("hr");
      let input = document.createElement("input");

      input.addEventListener("change", () => {
        this.session.send({
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
    let index = 0;

    // get the index for alphabetical sort
    for(let element of this.dropdown.elements) {
      if(projectName < element.label || element.label == "/list end")
        break;

      index++;
    }

    this.dropdown.addButtonBefore(
      index,
      projectName,
      () => this.session.swapProject(projectName)
    );
  }

  removeProject(projectName)
  {
    this.dropdown.removeElement(projectName);
  }

  renameProject(projectName, newName)
  {
    this.removeProject(projectName);

    // replace in alphabetical order,
    // recreating the trigger callback as well
    this.addProject(newName);
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "swap":
      this.session.setProject(message.name);
      break;
    case "add":
      this.addProject(message.name);
      break;
    case "remove":
      this.removeProject(message.name);
      break;
    case "rename":
      this.renameProject(message.oldName, message.newName);
      break;
    }
  }
}