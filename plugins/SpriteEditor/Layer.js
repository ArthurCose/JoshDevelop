class Layer
{
  constructor(width, height)
  {
    super();
    this.pixels = [];
    this.width = width;
    this.height = height;
    this.name;
    
    this.clear();
  }

  get name()
  {
    return nameElement.innerText;
  }

  set name(value)
  {
    nameElement.innerText = value;
  }

  getPixel(x, y)
  {
    x = Math.floor(x);
    y = Math.floor(y);

    let row = this.pixels[x];

    // return an alpha colorIndex
    if(!row)
      return -1; 
    
    let colorIndex = row[y];

    // return alpha index if undefined
    // otherwise return the colorIndex
    return colorIndex ? colorIndex : -1;
  }

  setPixel(x, y, colorIndex)
  {
    x = Math.floor(x);
    y = Math.floor(y);

    if(x > -1 && x < this.width && y > -1 && y < this.height)
      this.pixels[x][y] = colorIndex;
  }

  clear()
  {
    this.pixels = [];

    for(let x = 0; x < this.width; x++)
      this.pixels[x] = this.createPadding(this.height);
  }

  // todo
  scale(width, height)
  {
  }

  /** 
   * creates an array of alphaIndex using the
   * specified length
   * 
   * @param {number} length
   * @returns {number[]}
   */
  createPadding(length)
  {
    return [].fill(-1, 0, length);
  }

  padTop(size)
  {
    // we append values only so reusing an
    // array does not matter
    let padding = this.createPadding(size);

    // append padding to the start of each column
    for(let x = 0; x < this.width; x++)
      this.pixels.splice(0, 0, ...padding);
  }

  padBottom(size)
  {
    let padding = this.createPadding(size);

    for(let x = 0; x < this.width; x++)
    {
      let column = this.pixels[x];

      // append padding to the bottom of the column
      column.splice(column.length, 0, ...padding);
    }
  }

  padLeft(size)
  {
    for(let i = 0; i < size; i++)
      this.pixels.splice(0, 0, this.createPadding(this.height));
  }

  padRight(size)
  {
    for(let i = 0; i < size; i++)
      this.pixels.splice(this.pixels.length, 0, this.createPadding(this.height));
  }
}