
function getFileName(filePath)
{
  let lastSlash = filePath.lastIndexOf('/') + 1;
  
  return filePath.slice(lastSlash, filePath.length);
}

function getParentPath(folderPath)
{
  let lastSlash = folderPath.lastIndexOf('/');
  
  if(lastSlash == -1)
    return "";
  
  return folderPath.slice(0, lastSlash);
}

class FileTree
{
  getFile(filePath)
  {
    if(typeof filePath != "string")
      return;
    
    let name = getFileName(filePath);
    let parentPath = getParentPath(filePath);
    let parentFolder = this.getFolder(parentPath);
    
    if(parentFolder == undefined)
      return undefined;
    
    for(let child of parentFolder.children)
      if(child.isFile && child.name == name)
        return child;
    
    return undefined;
  }
  
  getFolder(folderPath)
  {
    if(typeof folderPath != "string")
      return;

    let folder = this.root;
    let splitPath = folderPath.split('/');
    let index = 0;
    
    if(splitPath[index] == this.root.name)
      index++;
    
    if(folderPath == this.root.name || folderPath == this.root.name + "/")
      return folder;
    
    for(let i = 0; i < folder.children.length; i++)
    {
      let child = folder.children[i];
      
      // must be a folder and name must match
      if(child.isFile || child.name != splitPath[index])
        continue;
      
      // restart loop
      i = -1;
      index++;
      folder = child;
      
      // last node and match, return this
      if(index == splitPath.length)
        return folder;
    }
    
    return undefined;
  }

  getNode(nodePath, isFile)
  {
    return isFile ? this.getFile(nodePath) :
                    this.getFolder(nodePath);
  }
  
  registerNode(filePath, isFile)
  {
    let name = getFileName(filePath);
    let parentPath = getParentPath(filePath);
    let parentFolder = this.getFolder(parentPath);
    
    if(parentFolder == undefined)
      parentFolder = this.registerSubFolder(parentPath);
    
    return isFile ? parentFolder.registerFile(name) :
                    parentFolder.registerSubFolder(name);
  }
}

if(typeof module !== 'undefined')
    module.exports = FileTree;