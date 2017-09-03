class Plugin
{
  constructor(core, internalPath)
  {
    this.core = core;
    this.internalPath = internalPath;
    /**
     * Folder relative to this folder used to serve web files.
     * @prop {?string}
     */
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
     * Current hooks:
     *  connect(session)
     *  disconnect(session)
     *  message(session, message)
     * @prop {Object.<string, function>} hooks
     */
    this.sessionHooks;
  }

  /** 
   * Provides access to Express no parsers
   * @param express
   * @param app
   */
  addStaticRoutes(express, app) {}

  /** 
   * Provides access to Express and parsers
   * @param express
   * @param app
   */
  addDynamicRoutes(express, app) {}
}

module.exports = Plugin;