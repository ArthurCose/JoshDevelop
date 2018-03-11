import SearchPanel from "./SearchPanel.js";


export default function main(session)
{
  let searchPanel = new SearchPanel(session);

  session.toolbar.addButton("Search", () => searchPanel.attach());
}

