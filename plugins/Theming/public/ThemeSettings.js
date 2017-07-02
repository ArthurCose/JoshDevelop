class ThemeSettings extends SettingsSection
{
  constructor()
  {
    super("Theme");

    this.contentElement.className = "theme-settings";
    this.styleElement = document.createElement('style');
    document.head.appendChild(this.styleElement);
    
    let themes = [
      "default",
      "joshua",
      "cornflowerblue",
      "sea green",
      "strawberry",
      "code",
      "custom -todo"
    ];

    this.appendText("Current Theme: ");
    this.appendDropdownInput(this.theme, themes, (value) => this.theme = value);

    this.updateCSS(() => {
      document.querySelector("link[href='plugins/Theming/public/stylesheet.css']")
              .remove();
    });

  }

  get theme()
  {
    let theme = this.settings.theme;

    return theme === undefined ? "default" : theme;
  }

  set theme(value)
  {
    this.settings.theme = value;
    this.saveSettings();
    this.updateCSS();
  }

  updateCSS(callback)
  {
    if(this.theme != "custom -todo")
    {
      let xhr = new XMLHttpRequest();
      
      xhr.addEventListener("load", (e) => {
        this.styleElement.innerText = e.target.response;
        if(callback)
          callback();
      });
      xhr.open('GET', `/plugins/Theming/public/themes/${this.theme}.css`);
      xhr.send();
    }
    else if(callback)
      callback();
  }
}

session.on("load", (session) => {
  session.settings.addSection(new ThemeSettings());
});