export default class Plugin
{
  constructor(core, internalPath)
  {
    this.core = core;
    this.internalPath = internalPath;
    /**
     * Folder relative to this folder used to serve web files.
     * @type {?string} publicPath
     */
    this.publicPath;
    /**
     * This script should export a main function that accepts the session
     * as an argument.
     * @type {string[]} clientEntry
     */
    this.clientEntry;
    /**
     * An array of paths relative to the publicPath to serve
     * css from.
     * @type {string[]} stylesheets
     */
    this.stylesheets;
    /**
     * An array of paths relative to website's root to serve css from
     * javascript from.
     * @type {string[]} externalStylesheets
     */
    this.externalStylesheets;
    /**
     * Current hooks:
     *  connect(session)
     *  disconnect(session)
     *  message(session, message)
     * @type {Object.<string, function>} sessionHooks
     */
    this.sessionHooks;
    /**
     * List of permissions that can be enabled/disabled.
     * Used for permission management.
     * @type {string[]} availablePermissions
     */
    this.availablePermissions;
  }

  /**
   * Provides access to the server for addStaticRoute()
   * @param server
   */
  addStaticRoutes(server) {}

  /**
   * Provides access to the server for addDynamicRoute()
   * @param server
   */
  addDynamicRoutes(server) {}
}