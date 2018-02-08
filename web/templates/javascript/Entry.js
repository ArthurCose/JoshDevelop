import Session from "./Session.js";

let session = new Session();

loadPlugins()
  .then(() => session.connect());

async function loadPlugins()
{
  let pluginEntryScripts = <%- JSON.stringify(entryScripts) %>;
  let importPromises = [];

  for(let entryScript of pluginEntryScripts) {
    let importPromise = import(entryScript).then(loadPlugin);

    importPromises.push(importPromise);
  }

  await Promise.all(importPromises);
}

function loadPlugin(module)
{
  module.default(session);
}