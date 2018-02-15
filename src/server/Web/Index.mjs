
import ejs from "ejs";
import walkSync from "walk-sync";
import fs from "fs";

export default function generateIndexMiddleware(server)
{
  let index = generateIndex(server.plugins);

  return async (ctx, next) => {
    if(ctx.path == "/")
      ctx.body = index;
    else
      await next();
  }
}

function generateIndex(plugins)
{
  // use sets to keep values unique
  let data = {
    scripts: new Set(),
    stylesheets: new Set()
  };

  // get main stylesheets
  let mainCSS = walkSync("web/public/stylesheets", { directories: false });
  mainCSS.forEach((value, index) => data.stylesheets.add(`stylesheets/${value}`));

  // get scripts and stylesheets required for plugins to work
  for(let plugin of plugins) {
    if(!plugin.publicPath)
      continue;

    let publicPath = plugin.internalPath + "/" + plugin.publicPath;

    // add dependency scripts
    if(plugin.externalScripts)
      for(let filePath of plugin.externalScripts)
        data.scripts.add(filePath);

    // add dependency stylesheets
    if(plugin.externalStylesheets)
      for(let filePath of plugin.externalStylesheets)
        data.stylesheets.add(filePath);

    // add stylesheets
    if(plugin.stylesheets)
      for(let filePath of plugin.stylesheets)
        data.stylesheets.add(publicPath + "/" + filePath);
  }

  // load the index.html template
  let template = fs.readFileSync("web/templates/index.html", "utf8");

  // return the rendered index
  return ejs.render(template, data);
}
