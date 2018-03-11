import ToggleButton from "./ToggleButton.js";

export default class SearchPanel
{
  constructor(session)
  {
    this.session = session;

    this.element = document.createElement("div");
    this.element.id = "search";

    this.queryInput = document.createElement("input");
    this.queryInput.className = "search-bar";
    this.queryInput.placeholder = "Search";

    this.switchesElement = document.createElement("div");
    this.switchesElement.className = "switches";

    this.regexButton = new ToggleButton(".*", "Use RegExp");
    this.caseSensitiveButton = new ToggleButton("Aa", "CaseSensitive Search");
    this.wholeWordButton = new ToggleButton("\\b", "Whole Word Search");
    this.gitIgnoreButton = new ToggleButton(".git", "Ignore Files Using .gitignore", true);

    this.switchesElement.appendChild(this.regexButton.element);
    this.switchesElement.appendChild(this.caseSensitiveButton.element);
    this.switchesElement.appendChild(this.wholeWordButton.element);
    this.switchesElement.appendChild(this.gitIgnoreButton.element);

    this.resultsElement = document.createElement("div");
    this.resultsElement.className = "results";

    this.queryInput.addEventListener("keypress", (e) => {
      if(e.key == "Enter" && this.queryInput.value != "")
        this.search(this.queryInput.value);
    });

    this.element.appendChild(this.queryInput);
    this.element.appendChild(this.switchesElement);
    this.element.appendChild(this.resultsElement);
  }

  attach()
  {
    // attach to the tabbed container for editors for now
    let tabbedContainer = this.session.editorTabs;
    let tab = tabbedContainer.getTab(":search");

    if(!tab) {
      tab = tabbedContainer.addTab(":search", "Search", this.element);
      tab.on("close", () => this.clearOldResults())
    }

    tab.makeActive();
  }

  get useRegex()
  {
    return this.regexButton.selected;
  }

  get caseSensitive()
  {
    return this.caseSensitiveButton.selected;
  }

  get matchWholeWord()
  {
    return this.wholeWordButton.selected;
  }

  get useGitIgnore()
  {
    return this.gitIgnoreButton.selected;
  }

  search(query)
  {
    let xhr = new XMLHttpRequest();

    let json = {
      projectName: this.session.project,
      useRegex: this.useRegex,
      caseSensitive: this.caseSensitive,
      matchWholeWord: this.matchWholeWord,
      useGitIgnore: this.useGitIgnore,
      query
    };

    xhr.addEventListener("loadend", () => {
      if(xhr.status != 200)
        throw `Request failed: ${xhr.status}`;

      let {results} = JSON.parse(xhr.responseText);
      this.displayResults(results);
    });

    xhr.open("POST", "/search", true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(json));

    this.displayLoadingMessage();
  }

  displayLoadingMessage()
  {
    this.clearOldResults();

    let loadingElement = document.createElement("div");
    loadingElement.className = "loading";
    loadingElement.innerText = "Loading...";

    this.resultsElement.appendChild(loadingElement);
  }

  displayResults(results)
  {
    this.clearOldResults();

    for(let result of results)
      this.displayResult(result);
  }

  clearOldResults()
  {
    while(this.resultsElement.firstChild)
      this.resultsElement.removeChild(this.resultsElement.firstChild);
  }

  displayResult(result)
  {
    let resultElement = document.createElement("div");
    resultElement.className = "result";
    resultElement.innerText = `${result.fileName} (${result.count})`;
    resultElement.title = result.filePath;

    resultElement.addEventListener("click", () => {
      this.session.openEditor(result.filePath);
    });

    this.resultsElement.appendChild(resultElement);
  }
}