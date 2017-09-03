const Plugin = require("../../core/Plugin");
const User = require("../../core/User");

class ThemingPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";
    this.localScripts = ["ThemeSettings.js"];
    this.stylesheets = ["stylesheet.css"];
  }

  addDynamicRoutes(express, app)
  {
    app.use("/plugins/Theming/public/stylesheet.css", (req, res) => {
      let theme = this.getThemeFromSession(req.session);
      
      if(theme === undefined)
        res.end();
      else
        res.sendFile(`plugins/Theming/public/themes/${theme}.css`, {root: "./"});
    });
  }
  
  getThemeFromSession(sessionData)
  {
    let user = new User(sessionData.username);
  
    return user.get("settings").theme;
  }
}

module.exports = ThemingPlugin;