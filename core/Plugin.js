/**
 * @callback extraRouting 
 * @param {express} express
 * @param {app} app
 */

class Plugin{
  constructor()
  {
    /** Folder relative to this folder used to serve web files.
     * @prop {?string} */
    this.publicPath;
    /**
     * An array of paths relative to the publicPath to serve
     * javascript from
     * @prop {string[]} localScripts
     */
    this.localScripts;
    /**
     * An array of paths relative to the publicPath to serve
     * css from
     * @prop {string[]} stylesheets
     */
    this.stylesheets;
    /**
     * An array of paths relative to website's root to serve javascript from
     * @prop {string[]} externalScripts
     */
    this.externalScripts;
    /**
     * An array of paths relative to website's root to serve css from
     * javascript from
     * @prop {string[]} externalStylesheets
     */
    this.externalStylesheets;
    /** 
     * Extra express routing for any special uses 
     * @prop {extraRouting} extraRouting */
    this.extraRouting;
    // function dictionary
    // connect(session)
    // message(session, message)
    this.hooks;
  }
}

module.exports = Plugin;