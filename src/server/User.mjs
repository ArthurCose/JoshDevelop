import fs from "fs-extra";

export default class User
{
  constructor(username)
  {
    let path = User.getPath(username);
    let json = fs.readFileSync(path);

    this._data = JSON.parse(json);
    this.saving = false;
    this.saveQueued = false;
  }

  static get USERS_FOLDER()
  {
    return "users/";
  }

  static getPath(username)
  {
    return User.USERS_FOLDER + username.toLowerCase();
  }

  static generateColor()
  {
    let maxCount = 0;
    let color = "#";

    for(let i = 0; i < 3; i++) {
      if(maxCount < 2 && Math.random() > .5) {
        color += "F0";
        maxCount++;
      }
      else {
        color += "00";
      }
    }

    // reroll if we get black;
    return color == "#000000" ? User.generateColor() : color;
  }

  get(key)
  {
    return this._data[key];
  }

  set(key, value)
  {
    this._data[key] = value;
  }

  async save()
  {
    if(this.saving) {
      this.saveQueued = true;
      return;
    }

    let filePath = User.getPath(this.get("username"));
    let data = JSON.stringify(this._data);

    this.saving = true;
    await fs.writeFile(filePath, data);
    this.saving = false;

    if(this.saveQueued) {
      this.saveQueued = false;
      this.save();
    }
  }

  hasPermission(name)
  {
    return this.get("permissions").includes(name);
  }

  addPermission(name)
  {
    if(!this.hasPermission(name))
      this.get("permissions").push(name);
  }

  removePermission(name)
  {
    if(!this.hasPermission(name))
      return;

    let permissions = this.get("permissions");

    let index = permissions.indexOf(name);
    permissions.splice(index, 1);
  }
}
