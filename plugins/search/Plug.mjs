import Plugin from "../../src/server/Plugin";
import escapeStringRegexp from "escape-string-regexp";
import fs from "fs-extra";

export default class SearchPlugin extends Plugin
{
  constructor(core, internalPath)
  {
    super(core, internalPath);
    this.publicPath = "public";

    this.clientEntry = "Entry.js";
    this.stylesheets = ["searchpanel.css"];

    this.skippableExtensions = [
      "png", "webp", "jpg", "jpeg", "gif",
      "webm", "mp4", "mov",
      "ogg", "wav", "mp3",
      "zip", "rar", "tar", "gz"
    ];
  }

  addDynamicRoutes(server)
  {
    server.addDynamicRoute("/search", async (ctx) => await this.searchRoute(ctx));
  }

  async searchRoute(ctx)
  {
    let {
      projectName,
      query,
      useRegex,
      caseSensitive,
      matchWholeWord
    } = ctx.request.body;

    let project = this.core.projects[projectName];

    if(!project) {
      ctx.status = 400;
      ctx.body = `Project "${projectName}" does not exist.`;
      return;
    }

    let regex = this.createRegex(query, useRegex, caseSensitive, matchWholeWord);

    let results = await this.searchTree(project.fileManager, regex);

    ctx.body = JSON.stringify({results});
  }

  createRegex(queryString, useRegex, caseSensitive, matchWholeWord)
  {
    let flags = "g";

    if(!useRegex)
      queryString = escapeStringRegexp(queryString);

    if(!caseSensitive)
      flags += "i";

    if(matchWholeWord)
      queryString = `\\b${queryString}\\b`;

    return new RegExp(queryString, flags);
  }

  async searchTree(filetree, query)
  {
    let results = [];
    let folders = [filetree.root];

    while(folders.length > 0) {
      let folder = folders.pop();

      for(let fileNode of folder.children) {
        if(!fileNode.isFile)
          continue;
        if(this.skippableExtensions.includes(fileNode.extension))
          continue;

        let fileResults = await this.searchFile(fileNode, query);

        if(fileResults)
          results.push(fileResults);
      }
    }

    return results;
  }

  async searchFile(fileNode, regex)
  {
    try{
      let contents = await fs.readFile(fileNode.serverPath, "utf8");
      let matches = contents.match(regex);

      if(!matches)
        return null;

      let results = {
        fileName: fileNode.name,
        filePath: fileNode.clientPath,
        count: matches.length
      };

      return results;
    } catch(err) {
      return null;
    }
  }
}
