import Plugin from "../../src/server/Plugin";
import User from "../../src/server/User";
import fs from "fs-extra";

export default class ThemingPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.clientEntry = "ThemeSettings.js";
    this.stylesheets = ["stylesheet.css"];
  }

  addDynamicRoutes(server)
  {
    server.addDynamicRoute("/plugins/theming/public/stylesheet.css", async (ctx, next) => {
      let theme = this.getThemeFromSession(ctx.session);

      ctx.type = "text/css";
      ctx.body = await this.getThemeFromSession(ctx.session);
    });
  }

  async getThemeFromSession(sessionData)
  {
    let user = new User(sessionData.username);

    let settings = user.get("settings");
    let theme = settings.Theme ? settings.Theme.theme : undefined;

    if(theme == undefined)
      return "";

    if(theme == "custom")
      return settings.Theme.customCSS;

    return await fs.readFile(`plugins/theming/public/themes/${theme}.css`);
  }
}
