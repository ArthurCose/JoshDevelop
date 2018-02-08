import User from "./User";
import fs from "fs-extra";
import bcrypt from "bcrypt";
import path from "path";

const VALID_USERNAME_REGEX = /^[a-z0-9_]+$/i;
const LOGIN_PAGE = path.resolve("web/templates/login.html");

export default class Authentication
{
  static authenticate(req, res)
  {
    if(!req.body.action) {
      res.sendFile(LOGIN_PAGE);
      return;
    }

    let username = req.body.username;
    let password = req.body.password;
    let verifyPassword = req.body.verifyPassword;

    if(!VALID_USERNAME_REGEX.test(username)) {
      res.send("Invalid username.");
      return;
    }

    let action;

    if(req.body.action == "login")
      action = Authentication.login(username, password);
    else
      action = Authentication.register(username, password, verifyPassword);

    action.then(() => {
      req.session.username = username;
      res.end();
    }).catch((err) => res.send(err));
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
      throw "Passwords do not match!";

    if(password.length < 3)
      throw "Password must be at least 3 characters in length";

    if(username.length < 3)
      throw "Username must be at least 3 characters in length";

    try{
      await fs.mkdir(User.USERS_FOLDER);
    } catch(err) {
      if(err.code != "EEXIST")
        console.error(`Error creating USERS_FOLDER for registration: ${err.code}`);
    }

    let filePath = User.getPath(username);
    let fd = await fs.open(filePath, "wx")
                     .catch(() => {throw "User already exists"});

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

  static logout(req, res)
  {
    req.session.destroy();
    res.clearCookie("connect.sid");

    res.redirect("/auth");
  }
}
