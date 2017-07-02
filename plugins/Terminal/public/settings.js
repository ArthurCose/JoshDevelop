class TerminalSettings extends SettingsSection
{
  constructor()
  {
    super("Terminal");

    this.defaultColors = [
      "#000000",
      "#cc0000",
      "#00cc00",
      "#cccc00",
      "#0000cc",
      "#cc00cc",
      "#00cccc",
      "#bbbbbb",
      "#888888",
      "#ff0000",
      "#00ff00",
      "#ffff00",
      "#0000ff",
      "#ff00ff",
      "#00ffff",
      "#ffffff"
    ];

    this.table = new SettingsTable();
    this.styleElement = document.createElement('style');
    document.head.appendChild(this.styleElement);

    this.backgroundColor = this.settings.backgroundColor || "#000000";
    this.defaultColor = this.settings.defaultColor || "#ffffff";

    this.loadDefaultColors();
    this.loadExtraColors();

    this.contentElement.appendChild(this.table.table);
  }

  loadDefaultColors()
  {  
    this.styleElement.sheet.insertRule(`.terminal,.terminal .xterm-viewport{}`, 0);
    this.styleElement.sheet.insertRule(`.terminal div::selection{}`, 1);
    this.styleElement.sheet.insertRule(`.terminal .xterm .reverse-video.terminal-cursor{}`, 2);
    this.styleElement.sheet.insertRule(`span.reverse-video.terminal-cursor::selection{}`, 3);
    this.updateDefaultColorRules();

    let foregroundInput = this.createColorInput(this.defaultColor, (value) => {
      this.defaultColor = value;
      this.settings["defaultColor"] = value;
      this.saveSettings();

      for(let i = 0; i < 16; i++)
        this.updateColorRule(i);
      
      this.updateDefaultColorRules();
    });
    
    let backgroundInput = this.createColorInput(this.backgroundColor, (value) => {
      this.backgroundColor = value;
      this.settings["backgroundColor"] = value;
      this.saveSettings();

      for(let i = 0; i < 16; i++)
        this.updateColorRule(i);
      
      this.updateDefaultColorRules();
    });
    
    this.table.appendRow(`Background Color `, backgroundInput);
    this.table.appendRow(`Default Color `, foregroundInput);
  }

  loadExtraColors()
  {
    for(let i = 0; i < 16; i++)
    {
      this.styleElement.sheet.insertRule(`.xterm-color-${i}{}`, i * 2 + 4);
      this.styleElement.sheet.insertRule(`.xterm-color-${i}::selection{}`, i * 2 + 5);
      this.updateColorRule(i);

      let input = this.createColorInput(this.getColor(i), (value) => {
        this.settings["color " + i] = value;
        this.saveSettings();

        this.updateColorRule(i);
      });
      
      this.table.appendRow(`Color ${i} `, input);
    }
  }

  getColor(i)
  {
    return this.settings["color " + i] || this.defaultColors[i];
  }

  updateDefaultColorRules()
  {
    let defaultRule = this.styleElement.sheet.cssRules[0];
    let highlightRule = this.styleElement.sheet.cssRules[1];
    let caretRule = this.styleElement.sheet.cssRules[2];
    let caretHighlightRule = this.styleElement.sheet.cssRules[3];
    
    caretRule.style.backgroundColor = this.defaultColor;
    caretRule.style.outline = 0;
    caretHighlightRule.style.backgroundColor = this.backgroundColor;

    defaultRule.style.color = this.defaultColor;
    defaultRule.style.backgroundColor = this.backgroundColor;
    highlightRule.style.color = this.backgroundColor;
    highlightRule.style.backgroundColor = this.defaultColor;
  }

  updateColorRule(i)
  {
    let color = this.getColor(i);

    //xterm-color-${i}
    let defaultRule = this.styleElement.sheet.cssRules[i * 2 + 4];
    //xterm-color-${i}::selection
    let highlightRule = this.styleElement.sheet.cssRules[i * 2 + 5];

    defaultRule.style.color = color;
    defaultRule.style.backgroundColor = this.backgroundColor;
    
    highlightRule.style.color = this.backgroundColor;
    highlightRule.style.backgroundColor = color;
  }
}