const User = require("../../core/User");

module.exports = {
  publicPath: "public",
  localScripts: ["ThemeSettings.js"],
  stylesheets: ["stylesheet.css"],
  extraRouting: (express, app) => {
    app.use("/plugins/Theming/public/stylesheet.css", (req, res) => {
      let theme = getThemeFromSession(req.session);
      
      if(theme === undefined)
        res.end();
      else
        res.sendFile(`plugins/Theming/public/themes/${theme}.css`, {root: "./"});
    });
  }
}

function getThemeFromSession(session)
{
  let user = new User(session.username);

  return user.get("settings").theme;
}