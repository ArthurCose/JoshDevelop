export default class FileClipboard
{
  constructor(filetree)
  {
    this.filetree = filetree;
    this._node = undefined;
    this._copy = false;
  }

  get contentExists()
  {
    return this._node != undefined;
  }

  cut(node)
  {
    this._copy = false;
    this._node = node;
  }

  copy(node)
  {
    this._copy = true;
    this._node = node;
  }

  paste(folderPath)
  {
    if(!this.contentExists)
      return;

    this.filetree.session.send({
      type: "filemanager",
      action: this._copy ? "copy" : "move",
      parentPath: folderPath,
      path: this._node.clientPath,
      isFile: this._node.isFile,
      name: this._node.name
    });

    this._node = undefined;
  }

  empty()
  {
    this._node = undefined;
    this._copy = false;
  }
}