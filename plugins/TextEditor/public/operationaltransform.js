"use strict";

class OperationTransformer
{
  // alters operationsA by operationsB
  static transformOperations(operationsA, operationsB)
  {
    for(let operationB of operationsB)
    {
      let clones = [];
      
      for(let operationA of operationsA)
      {
        // if operationB's owners contains operationA's original owner, skip
        if(operationB.owners.includes(operationA.owners[0]))
          continue;
        
        let clone = this.transformOperation(operationA, operationB);
        
        if(clone == undefined)
          continue;
        
        clones.push(clone);
      }
      
      // add the clones to the operation list
      operationsA = operationsA.concat(clones);
    }
    
    // we don't want clones to conflict with themselves
    // this loop transforms the cloned operations by their orginal
    for(let i = 0; i < operationsA.length - 1; i++)
    {
      let operationA = operationsA[i];
      let operationAClone = operationsA[i + 1];
      
      operationAClone.start = this.transformPosition(operationAClone.start, operationA);
      operationAClone.end = this.transformPosition(operationAClone.end, operationA);
    }
    
    return operationsA;
  }
  
  // alters operation A to show what it would look after operation B is applied to it
  // returns a clone of the operation, if the operation was split
  static transformOperation(operationA, operationB)
  {
    let clone = undefined;
    
    let newPosition = this.transformPosition(operationA.start, operationB);
    let columnOffset = operationA.end.column - operationA.start.column;
    let rowOffset = operationA.end.row - operationA.start.row;
    
    if(operationA.start.row == operationA.end.row)
      operationA.end.column = newPosition.column + columnOffset;
    
    operationA.start = newPosition;
    operationA.end.row = newPosition.row + rowOffset;
    
    
    if(operationA.action == "remove" && operationB.action == "remove")
    {
      let startAfter = this.comparePosition(operationA.start, operationB.start) >= 0;
      let endBefore = this.comparePosition(operationA.end, operationB.end) <= 0;
      // A's end is after B's start
      let endAfterStart = this.comparePosition(operationA.end, operationB.start) > 0;
      // A's start is before B's end
      let startBeforeEnd = this.comparePosition(operationA.start, operationB.end) < 0;
      
      // entirely inside, split operation B around operation A
      if(startAfter && endBefore)
      {
        clone = this.cloneOperation(operationB);
        clone.start = this.clonePosition(operationA.end);
        clone.end = this.clonePosition(operationB.end);
        
        // turn on skip flag as operation B was already performed
        clone.skip = true;
        
        operationB.end = this.clonePosition(operationA.start);
        
        operationA.owners = operationA.owners.concat(operationB.owners);
      }
      // trim the end to the start of operation B
      else if(endAfterStart && endBefore)
      {
        // create a clone of the parts that match
        clone = this.cloneOperation(operationA);
        clone.start = this.clonePosition(operationB.start);
        clone.end = this.clonePosition(operationA.end);
        clone.owners = clone.owners.concat(operationB.owners);
        
        // turn on skip flag as these are the already performed matching parts
        clone.skip = true;
        
        // make sure operation B doesn't conflict with the clone
        operationB.start = this.clonePosition(clone.end);
        
        operationA.end = this.clonePosition(operationB.start);
      }
      // create a clone of the parts that match
      // trim the start to the end of operation B
      else if(startBeforeEnd && startAfter)
      {
        clone = this.cloneOperation(operationA);
        clone.start = this.clonePosition(operationA.start);
        clone.end = this.clonePosition(operationB.end);
        clone.owners = clone.owners.concat(operationB.owners);
        
        // turn on skip flag as these are the already performed matching parts
        clone.skip = true;
        
        // make sure operation B doesn't conflict with the clone
        operationB.end = this.clonePosition(clone.start);
        
        operationA.start = this.clonePosition(operationB.end);
      }
    }
    else if(operationA.action == "remove" && operationB.action == "insert")
    {
      // if text was inserted in the area where text was deleted
      // we're going to split the deletion into two parts to preserve
      // text deletion and insertion
      
      let endAfterBStarts = this.comparePosition(operationA.end, operationB.start) > 0;
      let startBeforeBStarts = this.comparePosition(operationA.start, operationB.start) <= 0;
      
      // operation B must be inside of operation A
      if(endAfterBStarts && startBeforeBStarts)
      {
        if(this.comparePosition(operationA.end, operationB.end) >= 0)
        {
          clone = this.cloneOperation(operationA);
          clone.start = this.clonePosition(operationB.end);
          clone.end = this.transformPosition(operationA.end, operationB);
        }
        
        operationA.end = this.clonePosition(operationB.start);
      }
    }
    else if(operationA.action == "insert" && operationB.action == "remove")
    {
      // if text was inserted in the area where text was deleted
      // then we move the insertion to the start of where the text deletion happened
      
      let startAfter = this.comparePosition(operationA.start, operationB.start) >= 0;
      let startBeforeEnd = this.comparePosition(operationA.start, operationB.end) < 0;
      
      if(startAfter && startBeforeEnd)
      {
        operationA.end.row = operationB.start.row + operationA.end.row - operationA.start.row;
        
        if(operationA.start.row == operationA.end.row)
          operationA.end.column = operationB.start.column + operationA.end.column - operationA.start.column;
        
        operationA.start = this.clonePosition(operationB.start);
      }
    }
    
    return clone;
  }
  
  /**
   * Takes an operation and shifts a position accordingly
   * 
   * @param {position} position 
   * @param {*} operation
   * @returns {position} position 
   */
  static transformPosition(position, operation)
  {
    let newPosition = this.clonePosition(position);
    
    // caret is not moved by this operation
    if(this.comparePosition(newPosition, operation.start) < 0)
      return newPosition;
    if(operation.action == "remove" && this.comparePosition(newPosition, operation.end) < 0)
      return newPosition;
    
    let rowOffset = operation.end.row - operation.start.row;
    let startColumn = operation.start.column;
    
    if(rowOffset > 0)
      startColumn = 0;
    
    if(operation.action == "remove")
    {
      newPosition.row -= rowOffset;
      
      if(newPosition.row == operation.start.row)
        newPosition.column = startColumn + newPosition.column - operation.end.column;
    }
    else if(operation.action == "insert")
    {
      newPosition.row += rowOffset;
      
      if(newPosition.row == operation.end.row)
        newPosition.column = operation.end.column + newPosition.column - startColumn;
    }
    
    return newPosition;
  }
  
  static cloneOperation(operation)
  {
    return {
      action: operation.action,
      start: undefined,
      end: undefined,
      owners: operation.owners.slice(0)
    };
  }
  
  /**
   * 
   * @param {position} position 
   */
  static clonePosition(position)
  {
    return {row: position.row, column: position.column};
  }
  
  /**
   * 
   * @param {position} a 
   * @param {position} b 
   */
  static comparePosition(a, b)
  {
    // compare row
    if(a.row < b.row)
      return -1;
    if(a.row > b.row)
      return 1;

    // same row, compare column
    if(a.column < b.column)
      return -1;
    if(a.column > b.column)
      return 1;
    
    // it is the same position
    return 0;
  }
}


if(typeof module !== "undefined")
    module.exports = OperationTransformer;