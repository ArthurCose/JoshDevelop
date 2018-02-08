import Plugin from "../../src/server/Plugin";
import User from "../../src/server/User";

export default class ThemingPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.clientEntry = "ThemeSettings.js";
    this.stylesheets = ["stylesheet.css"];
  }

  addDynamicRoutes(express, app)
  {
    app.use("/plugins/Theming/public/stylesheet.css", (req, res) => {
      let theme = this.getThemeFromSession(req.session);

      if(theme === undefined) {
        res.contentType("text/css").end();
        return;
      }

      res.sendFile(`plugins/Theming/public/themes/${theme}.css`, {root: "./"});
    });
  }

  getThemeFromSession(sessionData)
  {
    let user = new User(sessionData.username);

    return user.get("settings").Theme.theme;
  }
}
