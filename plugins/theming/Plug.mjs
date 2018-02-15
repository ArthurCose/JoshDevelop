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

      if(theme === undefined) {
        ctx.body = "";
        return;
      }

      ctx.body = await fs.readFile(`plugins/theming/public/themes/${theme}.css`);
    });
  }

  getThemeFromSession(sessionData)
  {
    let user = new User(sessionData.username);

    let settings = user.get("settings");

    return settings.Theme ? settings.Theme.theme : undefined;
  }
}
