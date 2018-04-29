import Session from "./Session.js";
<% for(let i = 0; i < entryScripts.length; i++) { -%>
import { default as plugin<%- i %> } from "<%- entryScripts[i] %>";
<% } -%>

let session = new Session();

loadPlugins()
  .then(() => session.connect());

async function loadPlugins()
{
<% for(let i = 0; i < entryScripts.length; i++) { -%>
  plugin<%- i %>(session);
<% } -%>
}
