session.on("load", () => {
  session.fileManager.on("add", (filetree, node) => {
    if(!node.isFile)
      attachDropListeners(node);

    attachDownloadButton(node);
  });

  attachDropListeners(session.fileManager.root);
  attachDownloadButton(session.fileManager.root);
});

function attachDownloadButton(node)
{
  node.on("menu", (node, menu) => {
    menu.addButtonBefore("Delete", "Download", () => {
      let filePath = encodeURIComponent(node.clientPath);
      let projectName = encodeURIComponent(session.project);

      window.location = `/download?project=${projectName}&path=${filePath}`;
    });
  });
}

function attachDropListeners(node)
{
  // allow dragging files
  node.controlElement.addEventListener("dragover", (e) => e.preventDefault());
  node.listElement.addEventListener("dragover", (e) => e.preventDefault());

  node.controlElement.addEventListener("drop", (e) => dropFiles(node, e));
  node.listElement.addEventListener("drop", (e) => dropFiles(node, e));
}

function dropFiles(folderNode, e)
{
  e.stopPropagation();
  e.preventDefault();

  let files = e.target.files || e.dataTransfer.files;
  let projectName = encodeURIComponent(session.project);
  let safeclientPath = encodeURIComponent(folderNode.clientPath);

  let xhr = new XMLHttpRequest();
  let formData = new FormData();

  for(let file of files)
    formData.append(file.name, file);

  session.displayPopup(`Uploading ${files.length} file(s).`);

  xhr.addEventListener("loadend", () => {
    session.displayPopup(xhr.responseText);
  });

  xhr.open(
    "POST",
    `${window.location.origin}/upload?project=${projectName}&parentPath=${safeclientPath}`,
    true
  );

  xhr.send(formData);
}