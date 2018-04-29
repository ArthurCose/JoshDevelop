import { TabbedContainer } from "./Tabs.js";

export default class MainContainer extends TabbedContainer {
  constructor(element, session) {
    super(element);
    this.session = session;

    let saveLayout = () => this.saveLayout();

    this.on("add", (container, tab) => {
      tab.on("reidentify", saveLayout);
      saveLayout();
    });

    this.on("swap", saveLayout);
    this.on("slide", saveLayout);
    this.on("remove", saveLayout);
  }

  saveLayout() {
    let openTabs = this.tabs
      .map(tab => tab.identifier)
      .filter(path => !path.startsWith(':'));

    let activeTab;

    if(this.activeTab && !this.activeTab.identifier.startsWith(':'))
      activeTab = this.activeTab.identifier;

    let layout = { activeTab, openTabs };

    this.session.send({ type: "layout", layout });
  }

  loadLayout(layout) {
    if(!layout)
      return;

    for(let path of layout.openTabs) {
      let focus = path == layout.activeTab;
      this.session.openEditor(path, focus);
    }
  }
}
