import {register} from "./src/server/Authentication";
import User from "./src/server/User";
import {prompt, sensitivePrompt} from "./src/server/Prompt";
import walkSync from "walk-sync";

export default async function initialSetup()
{
  let userCount = walkSync(User.USERS_FOLDER).length;

  if(userCount > 0)
    return;

  console.log("Create an admin account:\n")

  let accountCreated = false;

  while(!accountCreated) {
    try{
      await createAdmin();

      accountCreated = true;
    } catch(err) {
      console.log(err);
    }
  }
}

async function createAdmin()
{
  let username = await prompt("Username: ");
  let password = await sensitivePrompt("Password: ");
  let verifyPassword = await sensitivePrompt("Verify password: ");

  await register(username, password, verifyPassword);

  let user = new User(username);

  user.addPermission("user");
  user.addPermission("admin");

  await user.save();
}
