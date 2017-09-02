const fs = require("fs-extra");

class User
{
  constructor(username)
  {
    let json = fs.readFileSync(User.getPath(username));
    this._data = JSON.parse(json);
    this.permissions = this.get("permissions");
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

    for(let i = 0; i < 3; i++)
    {
      if(maxCount < 2 && Math.random() > .5)
      {
        color += "F0";
        maxCount++;
      }
      else
      {
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

    this.save();
  }

  async save()
  {
    if(this.saving)
    {
      this.saveQueued = true;
      return;
    }

    let filePath = User.getPath(this.get("username"));
    let data = JSON.stringify(this._data);

    this.saving = true;
    await fs.writeFile(filePath, data);
    this.saving = false;

    if(this.saveQueued)
    {
      this.saveQueued = false;
      this.save();
    }
  }

  hasPermission(name)
  {
    return this.permissions.includes(name);
  }

  addPermission(name)
  {
    if(!this.hasPermission)
      this.permissions.push(name);
  }

  removePermission(name)
  {
    if(!this.hasPermission)
      return;

    let index = this.permissions.indexOf(name);
    this.permissions.splice(index, 1);
  }
}

module.exports = User;