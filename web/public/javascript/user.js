class User extends EventRaiser
{
  constructor(name, color, id)
  {
    super();

    this.addEvent("update");

    this.element = document.createElement("div");
    this.element.className = "user";

    this.colorElement = document.createElement("input");
    this.colorElement.type = "color";
    this.colorElement.className = "usercolor";
    this.colorElement.disabled = true;

    this.nameElement = document.createElement("span");
    this.nameElement.className = "username";

    this.name = name;
    this.color = color;
    this.id = id;

    if(session.id == id)
    {
      this.nameElement.contentEditable = true;
      this.nameElement.style.fontWeight = "bold";
      this.colorElement.disabled = false;

      this.colorElement.addEventListener("input", () => this.saveUpdate());
      this.nameElement.addEventListener("input", () => this.saveUpdate());
      this.nameElement.addEventListener("keydown", (e) => {
        if (e.keyCode != 13)
          return;

        e.preventDefault();
        window.getSelection().removeAllRanges();
      });
      this.nameElement.addEventListener("paste", (e) => e.preventDefault());

      this.checkCookies();
    }

    this.element.appendChild(this.colorElement);
    this.element.appendChild(this.nameElement);
    session.userlist.element.appendChild(this.element);
  }

  get name()
  {
    return this.nameElement.innerText;
  }

  set name(value)
  {
    this.nameElement.innerText = value;
    this.triggerEvent("update");
  }

  get color()
  {
    return this.colorElement.value;
  }

  set color(value)
  {
    this.colorElement.value = value;
    this.triggerEvent("update");
  }

  checkCookies()
  {
    let name = session.cookiejar.getCookie('username');
    let color = session.cookiejar.getCookie('usercolor');

    if(color)
      this.color = color;
    if(name)
      this.name = name;
    
    this.saveUpdate();
  }

  saveUpdate()
  {
    session.cookiejar.setCookie("username", this.name);
    session.cookiejar.setCookie("usercolor", this.color);

    session.send({
      type: "user",
      action: "update",
      name: this.name,
      color: this.color
    });
  }

  destroy()
  {
    this.element.remove();
  }
}

class UserList
{
  constructor()
  {
    this.element = document.getElementById("user-list");
    this.element.style.display = "none";
    this._users = [];

    let userSettingsButton = document.getElementById("user-settings");
    userSettingsButton.addEventListener("click", () => this.toggleDisplay());

  }

  toggleDisplay()
  {
    let show = this.element.style.display == "none";
    this.element.style.display = show ? "block" : "none";
  }

  getUser(id)
  {
    return this._users[id];
  }

  addUser(name, color, id)
  {
    this._users[id] = new User(name, color, id);
  }

  removeUser(id)
  {
    this.getUser(id).destroy();

    this._users[id] = undefined;
  }

  messageReceived(message)
  {
    switch(message.action)
    {
    case "add":
      this.addUser(message.name, message.color, message.userid);
      break;
    case "update":
      if(message.userid == session.id)
        break;

      let user = this.getUser(message.userid);

      user.name = message.name;
      user.color = message.color;
      break;
    case "remove":
      this.removeUser(message.userid);
      break;
    }
  }
}