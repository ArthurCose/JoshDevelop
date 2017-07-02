module.exports = {
  publicPath: "public",
  localScripts: ["ThemeSettings.js"],
  stylesheets: ["stylesheet.css"],
  extraRouting: (express, app) => {
    app.use("/plugins/Theming/public/stylesheet.css", (req, res) => {
      let theme = getThemeFromCookies(req.cookies);
      
      if(theme === undefined)
        res.end();
      else
        res.sendFile(`plugins/Theming/public/themes/${theme}.css`, {root: "./"});
    });
  }
}

function getThemeFromCookies(cookies)
{
  let themeSettings = cookies["Theme%20Settings"];

  if(!themeSettings)
    return;
  
  themeSettings = JSON.parse(themeSettings);
  let theme = themeSettings["theme"];

  return theme;
}