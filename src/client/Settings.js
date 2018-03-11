import {Tab, TabbedContainer} from "./Tabs.js";

export class SettingsMenu
{
  constructor(session)
  {
    this.session = session;
    this.settingsButtonElement = document.getElementById("settings-button");
    this.menuElement = document.createElement("div");
    this.tabs = new TabbedContainer(this.menuElement);
    this.sections = {};
    this.unloadedSections = [];

    this.menuElement.id = "settings";

    this.settingsButtonElement.addEventListener("click", () => this.attach());
  }

  attach() {
    let tabbedContainer = this.session.editorTabs;
    
    let tab = tabbedContainer.getTab(":settings");

    if(!tab)
      tab = tabbedContainer.addTab(":settings", "Settings", this.menuElement);

    tab.makeActive();
  }

  addSection(section)
  {
    let tab = this.tabs.addTab(section.title, section.title, section.contentElement);
    section.tab = tab;

    if(this.tabs.length == 1)
      tab.makeActive();

    tab.lock();
    this.sections[section.title] = section;
  }
}

export class SettingsTable
{
  constructor()
  {
    this.table = document.createElement("table");
  }

  appendRow(text, input)
  {
    let row = this.table.insertRow();
    let textCell = row.insertCell();
    let inputCell = row.insertCell();

    textCell.innerText = text;
    inputCell.appendChild(input);
  }
}

export class SettingsSection
{
  constructor(title, session)
  {
    // title couples as an identifier
    this.title = title;
    this.session = session;
    this.settings = this.session.settings[title] || {};

    this.contentElement = document.createElement("div");
    this.contentElement.style.display = "none";
    this.contentElement.style.width = "100%";
  }

  saveSettings()
  {
    this.session.send({
      type: "settings",
      section: this.title,
      data: this.settings
    });
  }

  createTextInput(startValue, onChange)
  {
    let input = document.createElement("input");
    input.value = startValue;
    input.addEventListener("change", () => onChange(input.value));

    return input;
  }

  appendTextInput(startValue, onChange)
  {
    let input = this.createTextInput();
    this.contentElement.appendChild(input);

    return input;
  }

  createDropdownInput(startValue, options, onChange)
  {
    let dropdown = document.createElement("select");

    for(let option of options) {
      let optionElement = document.createElement("option");
      optionElement.value = option;
      optionElement.text = option
      dropdown.add(optionElement);
    }

    dropdown.value = startValue;
    dropdown.addEventListener("change", () => onChange(dropdown.value));

    return dropdown;
  }

  appendDropdownInput(startValue, options, onChange)
  {
    let dropdown = this.createDropdownInput(startValue, options, onChange);
    this.contentElement.appendChild(dropdown);

    return dropdown;
  }

  createColorInput(startValue, onChange)
  {
    let input = this.createTextInput(startValue, onChange);
    input.type = "color";

    return input;
  }

  appendColorInput(startValue, onChange)
  {
    let input = this.createColorInput();
    this.contentElement.appendChild(input);

    return input;
  }

  createCheckbox(startChecked, onChange)
  {
    let checkboxElement = document.createElement("input");
    checkboxElement.type = "checkbox";
    checkboxElement.checked = startChecked;
    checkboxElement.addEventListener("change", () => onChange(checkboxElement.checked));

    return checkboxElement;
  }

  appendCheckbox(startChecked, onChange)
  {
    let checkboxElement = this.createCheckbox(startChecked, onChange);
    this.contentElement.appendChild(checkboxElement);

    return checkboxElement;
  }

  createTextElement(text)
  {
    let textElement = document.createElement("span");
    textElement.innerText = text;

    return textElement;
  }

  appendText(text)
  {
    let textElement = this.createTextElement(text);
    this.contentElement.appendChild(textElement);

    return textElement;
  }

  appendBreak()
  {
    let breakElement = document.createElement("br");

    this.contentElement.appendChild(breakElement);
  }
}