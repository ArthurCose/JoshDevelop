import {SettingsSection, SettingsTable} from "./Settings.js";

export default class PermissionManager extends SettingsSection
{
  constructor(session)
  {
    super("User Permissions", session);
    this.availablePermissions = [];

    this.contentElement.id = "permission-settings";

    session.send({
      type: "permissions",
      action: "get-lists"
    });
  }

  listUsers(users)
  {
    for(let user of users)
      this.addUser(user.username, user.permissions);
  }

  addUser(username, permissions)
  {
    let userElement = document.createElement("div");
    userElement.className = `user ${username}`;

    let usernameElement = this.createTextElement(username);
    usernameElement.className = "username";
    userElement.appendChild(usernameElement);

    let table = this.createPermissionsTable(username, permissions);
    userElement.appendChild(table);

    this.contentElement.appendChild(userElement);
  }

  createPermissionsTable(username, permissions)
  {
    let permissionsTable = new SettingsTable();
    permissionsTable.table.className = "permissions-table";

    for(let permission of this.availablePermissions) {
      let startChecked = permissions.includes(permission);

      let checkbox = this.appendCheckbox(
        startChecked,
        (checked) => this.updatePermission(username, permission, checked)
      );

      checkbox.className = `permission ${permission} ${username}`;

      permissionsTable.appendRow(permission, checkbox);
    }

    return permissionsTable.table;
  }

  updatePermission(username, permission, checked)
  {
    this.session.send({
      type: "permissions",
      action: checked ? "grant-permission" : "revoke-permission",
      username: username,
      permission: permission
    });
  }

  setCheckbox(username, permission, checked)
  {
    let selector = `#permission-settings .permission.${permission}.${username}`;
    let checkbox = document.querySelector(selector);
    checkbox.checked = checked;
  }

  removeUser(username)
  {
    let selector = `#permission-settings .user.${username}`;
    let userElement = document.querySelector(selector);
    userElement.remove();
  }

  messageReceived(message)
  {
    switch(message.action) {
    case "list-users":
      this.availablePermissions = message.availablePermissions;
      this.listUsers(message.users);
      break;
    case "grant-permission":
      this.setCheckbox(message.username, message.permission, true);
      break;
    case "revoke-permission":
      this.setCheckbox(message.username, message.permission, false);
      break;
    case "add-user":
      this.addUser(message.username, message.permissions);
      break;
    case "remove-user":
      this.removeUser(message.username);
      break;
    }
  }
}
