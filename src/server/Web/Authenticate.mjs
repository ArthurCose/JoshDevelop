import fs from "fs-extra";
import {login, register} from "../Authentication"

const TEMPLATE_PATH = "web/templates/login.html";

export default async function authenticate(ctx, next)
{
  let {action, username, password, verifyPassword} = ctx.request.body;

  if(!action) {
    ctx.type = "text/html";
    ctx.body = await fs.readFile(TEMPLATE_PATH);
    return;
  }

  let actionPromise;

  if(action == "login")
    actionPromise = login(username, password);
  else
    actionPromise = register(username, password, verifyPassword);

  try{
    await actionPromise;

    ctx.session.username = username;
    ctx.body = "";
  } catch(err) {
    ctx.body = err;
  }
}
