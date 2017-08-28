const fs = require("fs-promise");

class TextDocument
{
  constructor(fileNode)
  {
    this.fileNode = fileNode;
    this.lines = [""];
    this.revisions = [];
    this.saving = false;
    this.saveQueued = false;

    this.open();
  }

  open()
  {
    let contents = fs.readFileSync(this.fileNode.serverPath, "utf8");
    contents = contents.replace(/\r/g, "");
    this.lines = contents.split("\n");
  }
  
  save()
  {
    // don't try to save while already saving
    if(this.saving)
    {
      // queue a new save for after
      // the current save is finished
      this.saveQueued = true;
      return;
    }
    
    this.saving = true;
    
    this.fileNode.parentFolder.make().then(() => {
      fs.writeFile(this.fileNode.serverPath, this.lines.join("\r\n")).then(() => {
        this.saving = false;

        // save again
        if(this.saveQueued)
          this.save();
        
        this.saveQueued = false;
      }).catch((err) => console.log(err));
    });
  }
  
  applyOperation(operation)
  {
    switch(operation.action)
    {
    case "insert":
      this.insert(operation);
      break;
    case "remove":
      this.remove(operation);
      break;
    }

    this.revisions.push(operation);
  }
  
  insert(operation)
  {
    let line = this.lines[operation.start.row];
    let lineStart = line.slice(0, operation.start.column);
    let lineEnd = line.slice(operation.start.column, line.length);
    lineEnd = operation.lines[operation.lines.length - 1] + lineEnd;
    
    if(operation.lines.length == 1)
    {
      this.lines[operation.start.row] = lineStart + lineEnd;
      return;
    }
    
    this.lines[operation.start.row] = lineStart + operation.lines[0];
    
    let i = 1;
    
    for(; i < operation.lines.length - 1; i++)
      this.lines.splice(operation.start.row + i, 0, operation.lines[i]);
    
    this.lines.splice(operation.start.row + i, 0, lineEnd);
  }
    
  remove(operation)
  {
    let firstLine = this.lines[operation.start.row];
    let lastLine = this.lines[operation.end.row];
    
    firstLine = firstLine.slice(0, operation.start.column);
    lastLine = lastLine.slice(operation.end.column, lastLine.length);
    
    this.lines[operation.start.row] = firstLine + lastLine;
    
    let deletedRowCount = operation.end.row - operation.start.row;
    
    this.lines.splice(operation.start.row + 1, deletedRowCount);
  }
}

module.exports = TextDocument;