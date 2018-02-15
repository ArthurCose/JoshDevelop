
import ejs from "ejs";
import fs from "fs";

export default function generateEntryScriptMiddleware(server)
{
  let entryScript = generateEntryScript(server);

  return async (ctx, next) => {
    ctx.type = "text/javascript";
    ctx.body = entryScript;
  }
}

function generateEntryScript(server)
{
  let data = {
    entryScripts: []
  };

  for(let plugin of server.plugins) {
    if(!plugin.publicPath && !plugin.clientEntry)
      continue;

    let publicPath = `/${plugin.internalPath}/${plugin.publicPath}`;

    data.entryScripts.push(`${publicPath}/${plugin.clientEntry}`);
  }

  // load the Entry.js template
  let template = fs.readFileSync("web/templates/javascript/Entry.js", "utf8");

  // return the rendered index
  return ejs.render(template, data);
}
