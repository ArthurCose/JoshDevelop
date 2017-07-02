let session = new Session();

window.addEventListener("load", () => {
  document.body.addEventListener("dragover", (e) => e.preventDefault());
  document.body.addEventListener("drop", (e) => e.preventDefault());

  session.windowLoaded();
});