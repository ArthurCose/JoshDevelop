import User from "./User";
import fs from "fs-extra";
import bcrypt from "bcrypt";
import path from "path";

const VALID_USERNAME_REGEX = /^[a-z0-9_]+$/i;
const LOGIN_PAGE = path.resolve("web/templates/login.html");

export default class Authentication
{
  static async authenticate(ctx, next)
  {
    let {action, username, password, verifyPassword} = ctx.request.body;

    if(!action) {
      ctx.type = "text/html";
      ctx.body = await fs.readFile(LOGIN_PAGE);
      return;
    }

    if(!VALID_USERNAME_REGEX.test(username)) {
      ctx.body = "Invalid username.";
      return;
    }

    let actionPromise;

    if(action == "login")
      actionPromise = Authentication.login(username, password);
    else
      actionPromise = Authentication.register(username, password, verifyPassword);

    try{
      await actionPromise;

      ctx.session.username = username;
      ctx.body = "";
    } catch(err) {
      ctx.body = err;
    }
  }

  static async login(username, password)
  {
    let filePath = User.getPath(username);
    let fileData = await fs.readFile(filePath, "utf8")
      .catch(() => {throw "User does not exist."});

    let hash = JSON.parse(fileData).password;

    let matches = await bcrypt.compare(password, hash);

    if(!matches)
      throw "Password does not match.";
  }

  static async register(username, password, verifyPassword)
  {
    if(password != verifyPassword)
      throw "Passwords do not match.";

    if(password.length < 3)
      throw "Password must be at least 3 characters in length.";

    if(username.length < 3)
      throw "Username must be at least 3 characters in length.";

    try{
      await fs.mkdir(User.USERS_FOLDER);
    } catch(err) {
      if(err.code != "EEXIST")
        console.error(`Error creating USERS_FOLDER for registration: ${err.code}`);
      throw "Internal server error.";
    }

    let filePath = User.getPath(username);
    let fd = await fs.open(filePath, "wx")
                     .catch(() => {throw "User already exists."});

    let data = {
      username: username,
      password: await bcrypt.hash(password, 8),
      nickname: username,
      color: User.generateColor(),
      settings: {},
      permissions: []
    };

    data = JSON.stringify(data);

    await fs.write(fd, data);
    await fs.close(fd);
  }

  static async logout(ctx, next)
  {
    ctx.session = null;

    ctx.redirect("/auth");
  }
}
