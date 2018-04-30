import path from "path";

const reservedNames = [
  ".", "..", "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4",
  "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4",
  "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"
];

const reservedChars = [
  '<', '>', ':', '"', '\/', '\\', '|', '?', '*'
];

// 0-31
for(let i = 0; i <= 31; i++) {
  let char = String.fromCharCode(i);
  reservedChars.push(char);
}

const reservedCharsRegex = new RegExp(`[${reservedChars.join("")}]`);


export default function getFileNameErrors(name)
{
  if(typeof name != "string")
    return "Type of 'name' is not string.";
  if(name == "")
    return "'name' can not be blank.";
  if(name.includes(path.sep))
    return `'name' can not contain path separators. (${path.sep})`;
  if(reservedCharsRegex.test(name))
    return `'name' contains reserved characters.`;
  if(reservedNames.includes(name))
    return "'name' matches a reserved name.";
  if(name.endsWith("."))
    return "'name' can not end with a dot.";

  // success
  return;
}
