import {SettingsSection} from "/javascript/client/Settings.js";

const PUBLIC_PATH = "plugins/theming/public";

export default function main(session)
{
  session.on("connect", () => {
    session.settingsMenu.addSection(
      new ThemeSettings(session)
    );
  });
}

class ThemeSettings extends SettingsSection
{
  constructor(session)
  {
    super("Theme", session);

    this.contentElement.className = "theme-settings";
    this.styleElement = document.createElement("style");
    document.head.appendChild(this.styleElement);

    let themes = [
      "default",
      "joshua",
      "cornflowerblue",
      "sea green",
      "strawberry",
      "code",
      "hackerman",
      "custom"
    ];

    this.appendText("Current Theme: ");
    this.appendDropdownInput(this.theme, themes, (value) => this.theme = value);

    this.updateCSS().then(() => {
      document.querySelector(`link[href='${PUBLIC_PATH}/stylesheet.css']`)
              .remove();
    });
  }

  get theme()
  {
    let theme = this.settings.theme;

    return theme || "default";
  }

  set theme(value)
  {
    this.settings.theme = value;
    this.saveSettings();
    this.updateCSS();
  }

  get customCSS()
  {
    let css = this.settings.customCSS;

    return css || "";
  }

  set customCSS(value)
  {
    this.settings.customCSS = value;
    this.saveSettings();
    this.updateCSS();
  }

  async updateCSS(callback)
  {
    let css =
      this.theme == "custom"
        ? this.customCSS
        : await this.downloadCSS();

    this.styleElement.innerText = css;
  }

  async downloadCSS()
  {
    let response = await fetch(`/${PUBLIC_PATH}/themes/${this.theme}.css`);

    return response.text();
  }
}
