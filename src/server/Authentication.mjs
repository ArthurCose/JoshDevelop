import User from "./User";
import bcrypt from "bcrypt";
import fs from "fs-extra";

const VALID_USERNAME_REGEX = /^[a-z0-9_]+$/i;

/**
 * Throws on failure.
 */
export async function login(username, password)
{
  let filePath = User.getPath(username);
  let fileData = await fs.readFile(filePath, "utf8")
    .catch(() => {throw "User does not exist."});

  let hash = JSON.parse(fileData).password;

  let matches = await bcrypt.compare(password, hash);

  if(!matches)
    throw "Password does not match.";
}

/**
 * Throws on failure.
 */
export async function register(username, password, verifyPassword)
{
  if(!VALID_USERNAME_REGEX.test(username))
    throw "Username can only contain alphanumeric characters and underscores.";

  if(username.length < 3)
    throw "Username must be at least 3 characters in length.";

  if(password != verifyPassword)
    throw "Passwords do not match.";

  if(password.length < 3)
    throw "Password must be at least 3 characters in length.";

  try{
    await fs.mkdir(User.USERS_FOLDER);
  } catch(err) {
    if(err.code != "EEXIST") {
      console.error(`Error creating USERS_FOLDER for registration: ${err.code}`);
      throw "Internal server error.";
    }
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
