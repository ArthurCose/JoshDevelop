let Range = ace.require("ace/range").Range;

export default class Caret
{
  constructor(userid, aceEditor, session)
  {
    this._range = new Range(0,0,0,0);
    this._user = session.userList.getUser(userid);

    this.aceEditor = aceEditor;
    this.aceSession = aceEditor.session;

    this.lastUpdate = Date.now();
    // in ms, flash time is twice as long
    this.blinkSpeed = 350;
    this.blinkEnabled = false;
    this.blinkTimer = undefined;
    this.visible = true;

    this.aceSession.addDynamicMarker(this, false);

    this.listeners = [
      this._user.on("update", () => this.redraw())
    ];
  }

  get blink()
  {
    if(!this.blinkEnabled ||
       this.start.row != this.end.row ||
       this.start.column != this.end.column)
      return false;

    var difference = Date.now() - this.lastUpdate;

    return Math.floor(difference / this.blinkSpeed) % 3 == 2;
  }

  get color()
  {
    return this._user.color;
  }

  get start()
  {
    return this._range.start;
  }

  set start(value)
  {
    this._range.start = value;
  }

  get end()
  {
    return this._range.end;
  }

  set end(value)
  {
    this._range.end = value;
  }

  enableBlink()
  {
    this.visible = false;
    this.blinkEnabled = true;

    this.blinkTimer = setInterval(() => this.redraw(true), this.blinkSpeed);

    this.aceEditor.on("blur", () => {
      this.visible = false;
      this.redraw();
    });

    this.aceEditor.on("focus", () => {
      this.visible = true;
    });
  }

  updatePosition(range)
  {
    this.start = range.start;
    this.end = range.end;

    this.redraw();
  }

  update(html, markerLayer, session, config)
  {
    if(this.blink || !this.visible)
      return;

    if(this.end.row - this.start.row > 0)
      this.drawMultiline(this.start, this.end, html, markerLayer, config);
    else
      this.drawLine(
        this.start.row,
        this.start.column,
        this.end.column - this.start.column,
        html, markerLayer, config
      );
  }

  drawMultiline(start, end, html, markerLayer, config)
  {
    this.drawLine(start.row, start.column, -1, html, markerLayer, config);

    for(let row = start.row + 1; row < end.row; row++)
      this.drawLine(row, 0, -1, html, markerLayer, config);

    this.drawLine(end.row, 0, end.column, html, markerLayer, config);
  }

  drawLine(row, column, columns, html, markerLayer, config)
  {
    let width = columns > -1 ? config.characterWidth * columns + "px" : "100%";
    let top = markerLayer.$getTop(row, config);
    let left = markerLayer.$padding + column * config.characterWidth;
    let right = columns > -1 ? "auto" : "0";

    html.push(
      "<div style='",
      "position: absolute;",
      "width:", width, ";",
      "height:", config.lineHeight, "px;",
      "top:", top, "px;",
      "right:", right, ";",
      "left:", left, "px;",
      "background-color:", this.color, ";",
      "border-right: 2px solid", this.color, ";",
      "opacity: .6;",
      "z-index: 5;",
      "'></div>"
    );
  }

  redraw(silent)
  {
    this.aceSession._signal("changeBackMarker");

    if(!silent)
      this.lastUpdate = Date.now();
  }

  destroy()
  {
    this.aceSession.removeMarker(this.id);
    clearInterval(this.blinkTimer);

    for(let listener of this.listeners)
      listener.destroy();
  }
}