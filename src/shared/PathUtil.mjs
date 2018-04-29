export function getFileName(filePath)
{
  let lastSlash = filePath.lastIndexOf("/") + 1;

  return filePath.slice(lastSlash, filePath.length);
}

export function getParentPath(folderPath)
{
  let lastSlash = folderPath.lastIndexOf("/");

  if(lastSlash == -1)
    return "";

  return folderPath.slice(0, lastSlash);
}
