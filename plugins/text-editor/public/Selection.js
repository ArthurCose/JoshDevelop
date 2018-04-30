export default class Selection
{
  constructor(userId, range, aceEditor, session)
  {
    this._range = range;
    this._user = session.userList.getUser(userId);

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
      this._user.on("update", () => this.draw())
    ];
  }

  get blink()
  {
    if(!this.blinkEnabled)
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

  get end()
  {
    return this._range.end;
  }

  enableBlink()
  {
    this.blinkEnabled = true;

    this.blinkTimer = setInterval(() => this.draw(true), this.blinkSpeed);

    this.aceEditor.on("blur", () => {
      this.visible = false;
      this.draw();
    });

    this.aceEditor.on("focus", () => {
      this.visible = true;
    });
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

  draw(silent)
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
