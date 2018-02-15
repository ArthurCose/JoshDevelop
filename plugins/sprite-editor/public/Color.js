export default class Color
{
  constructor(r, g, b, a)
  {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  toInputHex()
  {
    let value = this.r << 16 | this.g << 8 | this.b;

    return "#" + value.toString(16).padStart(6, "0");
  }

  toRGBAString()
  {
    return `rgba(${this.r},${this.g},${this.b},${this.a})`;
  }

  static fromObject(object)
  {
    return new Color(object.r, object.g, object.b, object.a);
  }

  static fromInputHex(value)
  {
    value = value.replace("#", "");
    value = parseInt(value, 16);

    let r = value >> 16 & 0xFF;
    let g = value >> 8 & 0xFF;
    let b = value & 0xFF;

    return new Color(r, g, b, 255);
  }
}
