class UserList
{
  constructor()
  {
    this.element = document.getElementById("user-list");
    this.element.style.display = "none";
    this._users = [];

    let profileListButton = document.getElementById("user-list-button");
    profileListButton.addEventListener("click", () => this.toggleDisplay());
  }

  toggleDisplay()
  {
    let show = this.element.style.display == "none";
    this.element.style.display = show ? "block" : "none";
  }

  addUser(id, name, color, location)
  {
    let user = new Profile(id, name, color, location);
    
    this.element.appendChild(user.element);

    this._users[id] = user;

    return user;
  }

  removeUser(id)
  {
    this.getUser(id).destroy();

    delete this._users[id];
  }

  getUser(id)
  {
    return this._users[id];
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "add":
      let profile = this.addUser(
        message.sessionID,
        message.name,
        message.color,
        message.location
      );

      if(profile.id == session.id)
        session.profile = profile;
      break;
    case "update":
      if(message.sessionID == session.id)
        break;

      let user = this.getUser(message.sessionID);

      if(message.name)
        user.name = message.name;

      if(message.color)
        user.color = message.color;

      if(message.location)
        user.location = message.location;
      break;
    case "remove":
      this.removeUser(message.sessionID);
      break;
    }
  }
}

class Profile extends EventRaiser
{
  constructor(id, name, color, location)
  {
    super();
    this.id = id;

    this.generate();
    this.addEvent("update");

    this.name = name;
    this.color = color;
    this.location = location;
  }

  generate()
  {
    this.element = document.createElement("div");
    this.element.className = "user";

    this.nameElement = document.createElement("span");
    this.nameElement.className = "user-name";

    this.colorElement = document.createElement("input");
    this.colorElement.type = "color";
    this.colorElement.className = "user-color";
    this.colorElement.disabled = true;

    this.locationBeforeElement = document.createElement("span");
    this.locationBeforeElement.className = "user-location-before";

    this.locationElement = document.createElement("span");
    this.locationElement.className = "user-location";
    this.locationElement.addEventListener("click", () => this.follow());

    if(this.id == session.id)
      this.enableModification();

    this.element.appendChild(this.colorElement);
    this.element.appendChild(this.nameElement);
    this.element.appendChild(this.locationBeforeElement);
    this.element.appendChild(this.locationElement);
  }

  get name()
  {
    return this.nameElement.innerText;
  }

  set name(value)
  {
    this.nameElement.innerText = value;
    this.sendUpdate();
    this.triggerEvent("update");
  }

  get color()
  {
    return this.colorElement.value;
  }

  set color(value)
  {
    this.colorElement.value = value;
    this.sendUpdate();
    this.triggerEvent("update");
  }

  get location()
  {
    return this._location;
  }

  set location(value)
  {
    this._location = value;
    let fileName = value.slice(value.lastIndexOf("/") + 1);
    let beforeText = fileName == "" ? "" : " - ";

    this.locationBeforeElement.innerText = beforeText;
    this.locationElement.innerText = fileName;

    this.sendLocation();
    this.triggerEvent("update");
  }

  enableModification()
  {
    this.nameElement.contentEditable = true;
    this.nameElement.style.fontWeight = "bold";
    this.colorElement.disabled = false;

    this.colorElement.addEventListener("input", () => this.sendUpdate());
    this.nameElement.addEventListener("input", () => this.sendUpdate());
    this.nameElement.addEventListener("keydown", (e) => {
      if(e.keyCode != 13)
        return;

      e.preventDefault();
      window.getSelection().removeAllRanges();
    });
    this.nameElement.addEventListener("paste", (e) => e.preventDefault());
  }

  sendUpdate()
  {
    if(this.id != session.id)
      return;

    session.send({
      type: "profile",
      action: "update",
      name: this.name,
      color: this.color
    });
  }

  sendLocation()
  {
    if(this.id != session.id)
      return;

    session.send({
      type: "location",
      location: this.location
    });
  }
  
  follow()
  {
    if(this.location == "")
      return;

    let firstSlash = this.location.indexOf("/");
    let projectName = this.location.slice(0, firstSlash);

    if(session.project != projectName)
      session.swapProject(projectName);

    session.openEditor(this.location);
  }

  destroy()
  {
    this.element.remove();
  }
}