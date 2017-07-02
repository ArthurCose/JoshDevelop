class SettingsSection
{
  constructor(title)
  {
    // title couples as an identifier
    this.title = title;
    this.settings = this.loadSavedSettings();

    this.contentElement = document.createElement("div");
    this.contentElement.style.display = "none";
    this.contentElement.style.width = "100%";
  }

  loadSavedSettings()
  {
    let settings = session.cookiejar.getCookie(this.title + " Settings");

    return settings ? JSON.parse(settings) : {};
  }

  saveSettings()
  {
    session.cookiejar.setCookie(this.title + " Settings", JSON.stringify(this.settings));
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
    
    for(let option of options)
    {
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

class SettingsTable
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

class SettingsMenu
{
  constructor()
  {
    this.menuElement = document.getElementById("settings");
    this.settingsButtonElement = document.getElementById("settings-button");

    this.tabs = new TabbedContainer(this.menuElement);
    this.sections = {};
    this.unloadedSections = [];

    this.menuElement.tabIndex = 0;

    this.settingsButtonElement.addEventListener("click", () => {
      this.menuElement.style.display = "flex";
      this.menuElement.focus();
    });

    document.body.addEventListener("click", (e) => {
      let focusElementIsDescendant = this.menuElement.contains(e.target);

      if(!focusElementIsDescendant && e.target != this.settingsButtonElement)
        this.menuElement.style.display = "none";
    });
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