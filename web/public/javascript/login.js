let form = document.getElementById("form");
let submitButton = document.getElementById("submit");
let toggleButton = document.getElementById("toggle-action");

let usernameField = document.getElementById("username");
let passwordField = document.getElementById("password");
let verifyPasswordField = document.getElementById("verify-password");

let verifyPasswordContainer = document.getElementById("verify-password-container");

let action = "login";

toggleButton.addEventListener("click", () => {
  toggleButton.innerText = action;

  action = action == "login" ? "register" : "login";
  verifyPasswordContainer.style.display = action == "register" ? "block" : "none";

  submitButton.value = action;
});

form.addEventListener("submit", (e) => {
  e.preventDefault();

  let xhr = new XMLHttpRequest();

  let json = {
    action: action,
    username: encodeURIComponent(usernameField.value),
    password: encodeURIComponent(passwordField.value),
    verifyPassword: encodeURIComponent(verifyPasswordField.value)
  };

  xhr.addEventListener("loadend", () => {
    if(xhr.responseText != "")
      alert(xhr.responseText);
    else
      window.location = "/";
  });

  xhr.open(
    "POST",
    "auth",
    true
  );

  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify(json));
});