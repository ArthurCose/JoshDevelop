class AceSettings extends SettingsSection
{
  constructor()
  {
    super("Text Editor");

    this.editors = [];
    this.table = new SettingsTable();

    let tabSizeElement = document.createElement("input");
    tabSizeElement.type = "number";
    tabSizeElement.value = this.tabSize;
    tabSizeElement.style.width = "40px";
    tabSizeElement.addEventListener("change", () => {
      this.tabSize = tabSizeElement.value;
    });

    this.table.appendRow(
      "Use Soft Tabs: ",
      this.createCheckbox(this.useSoftTabs, (checked) => this.useSoftTabs = checked)
    );
    
    this.table.appendRow(
      "Show Invisibles: ",
      this.createCheckbox(this.showInvisibles, (checked) => this.showInvisibles = checked)
    );
    
    this.table.appendRow(
      "Show Indent Guides: ",
      this.createCheckbox(this.showIndentGuides, (checked) => this.showIndentGuides = checked)
    );

    this.table.appendRow("Tab Size: ", tabSizeElement);

    this.table.appendRow(
      "Theme: ", 
      this.createDropdownInput(this.theme, this.getThemes(), (value) => this.theme = value)
    );

    this.contentElement.appendChild(this.table.table);
  }

  getThemes()
  {
    let themelist = ace.require("ace/ext/themelist");
    let themes = [];
    
    for(let themeName in themelist.themesByName)
      themes.push(themeName);

    return themes;
  }

  get theme()
  {
    let theme = this.settings.aceTheme;

    return theme === undefined ? "chrome" : theme;
  }

  set theme(value)
  {
    for(let editor of this.editors)
      editor.setTheme(`ace/theme/${value}`);

    this.settings.aceTheme = value;
    this.saveSettings();
  }

  get tabSize()
  {
    let tabSize = this.settings.tabSize;

    return tabSize ? parseInt(tabSize) : 4;
  }

  set tabSize(value)
  {
    value = parseInt(value);

    for(let editor of this.editors)
      editor.setOption("tabSize", value);

    this.settings.tabSize = value;
    this.saveSettings();
  }

  get showInvisibles()
  {
    let showInvisibles = this.settings.showInvisibles;

    return showInvisibles === undefined ? false : showInvisibles;
  }

  set showInvisibles(value)
  {
    for(let editor of this.editors)
      editor.setShowInvisibles(value);

    this.settings.showInvisibles = value;
    this.saveSettings();
  }

  get showIndentGuides()
  {
    let showIndentGuides = this.settings.showIndentGuides;

    return showIndentGuides === undefined ? true : showIndentGuides;
  }

  set showIndentGuides(value)
  {
    for(let editor of this.editors)
      editor.setDisplayIndentGuides(value);

    this.settings.showIndentGuides = value;
    this.saveSettings();
  }

  get useSoftTabs()
  {
    let useSoftTabs = this.settings.useSoftTabs;
    
    return useSoftTabs === undefined ? true : useSoftTabs;
  }

  set useSoftTabs(value)
  {
    for(let editor of this.editors)
      editor.session.setUseSoftTabs(value);

    this.settings.useSoftTabs = value;
    this.saveSettings();
  }

  applySettings(aceEditor)
  {
    aceEditor.setTheme(`ace/theme/${this.theme}`);
    aceEditor.session.setUseSoftTabs(this.useSoftTabs);
    aceEditor.setShowInvisibles(this.showInvisibles);
    aceEditor.setOption("tabSize", this.tabSize);
    aceEditor.setDisplayIndentGuides(this.showIndentGuides);

    this.editors.push(aceEditor);
  }
}