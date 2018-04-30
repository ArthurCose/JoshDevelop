import User from "./User";
import chokidar from "chokidar";
import fs from "fs";

export default class PermissionTracker
{
  constructor(core)
  {
    this.core = core;
    this.users = {};
    this.permissionLists = [];
    this.availablePermissions = ["user", "admin"];

    let watcher = chokidar.watch(
      User.USERS_FOLDER,
      { awaitWriteFinish: true }
    );

    watcher.on("add", (path) => this.addUser(path));
    watcher.on("unlink", (path) => this.removeUser(path));
    watcher.on("change", (path) => this.updatePermissionList(path));
  }

  addUser(path)
  {
    try{
      let username = path.split("/")[1];
      let user = new User(username);

      // append the permission list
      this.permissionLists.push({
        username: username,
        permissions: user.get("permissions")
      });

      // sort lists alphabetically
      this.permissionLists = this.permissionLists.sort(
        (a, b) => a.username < b.username ? -1 : 1
      );

      this.users[username] = user;

      this.broadcastToAdmins({
        type: "permissions",
        action: "add-user",
        username: username,
        permissions: user.get("permissions")
      });
    } catch(err) {
      // exists to catch parsing errors
      console.error(`"${path}" is malformed: ${err.message}`);
    }
  }

  removeUser(path)
  {
    let username = path.split("/")[1];

    let listIndex = this.getListIndex(username);

    // malformed user was already not in the list
    if(listIndex == -1)
      return;

    this.permissionLists.splice(listIndex, 1);

    delete this.users[username];

    this.broadcastToAdmins({
      type: "permissions",
      action: "remove-user",
      username: username
    });
  }

  updatePermissionList(path)
  {
    try{
      let username = path.split("/")[1];
      let user = new User(username);

      let listIndex = this.getListIndex(username);
      this.permissionLists[listIndex].permissions = user.get("permissions");

      this.users[username] = user;
    } catch(err) {
      // exists to catch parsing errors
      console.error(`"${path}" is malformed: ${err.message}`);
    }
  }

  getListIndex(username)
  {
    return this.permissionLists.findIndex(
      (user) => user.username == username
    );
  }

  sendPermissionLists(session)
  {
    session.send({
      type: "permissions",
      action: "list-users",
      users: this.permissionLists,
      availablePermissions: this.availablePermissions
    });
  }

  grantPermission(username, permission)
  {
    let user = this.users[username];
    user.addPermission(permission);
    user.save();

    this.broadcastToAdmins({
      type: "permissions",
      action: "grant-permission",
      username: username,
      permission: permission
    });
  }

  revokePermission(username, permission)
  {
    let user = this.users[username];
    user.removePermission(permission);
    user.save();

    this.broadcastToAdmins({
      type: "permissions",
      action: "revoke-permission",
      username: username,
      permission: permission
    });
  }

  broadcastToAdmins(message)
  {
    for(let session of this.core.sessions)
      if(session.user.hasPermission("admin"))
        session.send(message);
  }

  messageReceived(session, message)
  {
    if(!session.user.hasPermission("admin"))
      return;

    switch(message.action) {
    case "get-lists":
      this.sendPermissionLists(session);
      break;
    case "grant-permission":
      this.grantPermission(message.username, message.permission);
      break;
    case "revoke-permission":
      this.revokePermission(message.username, message.permission);
      break;
    }
  }
}
