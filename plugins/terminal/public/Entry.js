import Shell from "./Shell.js";
import {TabbedContainer} from "/javascript/client/Tabs.js";
import {HSplit} from "/javascript/client/Splitter.js";

let shells = [];
let terminalTabs;

/*  <div id=terminal-container class="tabbed-container">
 *   <div class=tab-header>
 *     <div class=tab-container></div>
 *     <div id=add-terminal>+</div>
 *     <div id=clear-terminal>&#x1F5D1;</div>
 *   </div>
 *   <div class=tab-content></div>
 * </div>
 */
export default function main(session)
{
  session.on("connect", () => {
    if(!session.permissions.includes("terminal"))
      return;

    createTerminalDock(session);

    // start off with one terminal
    createTerminal(session);
  });

  session.on("message", (session, message) => {
    if(message.type == "shell")
      shells[message.id].messageReceived(message);
  });
}

function createTerminalDock(session)
{
  let terminalContainer = document.createElement("div");
  terminalContainer.id = "terminal-container";
  terminalContainer.class = "tabbed-container";
  terminalContainer.innerHTML = "\
    <div class=tab-header> \
      <div class=tab-container></div> \
      <div id=add-terminal>+</div> \
      <div id=clear-terminal>&#x1F5D1;</div> \
    </div> \
    <div class=tab-content></div>";
  document.body.appendChild(terminalContainer);


  document.getElementById("add-terminal").addEventListener(
    "click",
    () => createTerminal(session)
  );

  document.getElementById("clear-terminal").addEventListener(
    "click",
    () => {
      let activeShell = shells[terminalTabs.activeTab.identifier];
      activeShell.terminal.clear();
    }
  );

  terminalTabs = new TabbedContainer(terminalContainer);

  let hsplit = new HSplit(
    session.editorTabs.element,
    terminalTabs.element
  );

  session.editorTabs.element.style.flex = "none";
  hsplit.splitElement.style.flex = 1;

  hsplit.on("resize", () => {
    session.editorTabs.resized();
  });

  session.editorTabs.on("resize", () => terminalTabs.resized());

  window.addEventListener("resize", () => terminalTabs.resized());
}

function createTerminal(session)
{
  let element = document.createElement("div");
  element.className = "terminal";

  let id = shells.length;

  // create tab
  let tab = terminalTabs.addTab(id, `Terminal ${id + 1}`, element);
  tab.makeActive();

  // create shell
  let shell = new Shell(tab, element, session, id);

  // add to shell array
  shells.push(shell);

  return shell;
}