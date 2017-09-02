## Core

* See what file a user is in
  * Display that in the user list
    * Ability to request to go to that file at the exact same location
      through a click
      * A text editor would bring you to the line
      * An image editor would simply make their cursor more obvious
      * A "FollowUser" request seems like a good name
    * Only show the path, editors will handle details when requested
  * add to the User class as location
* File writing tools in ServerFileNode
* Login
  * admins should be able to give/withdraw privileges - such as terminal
    * privilege api for plugins

## Plugin Additions

* Text Editor
  * Templates
    * When a file is created add pregenerated content based off of extension
  * File search (name + content)
* Image editor
  * Display other clients cursor location
  * Hiding layers
  * Resize sprite
  * .sprite files and animation tools
* Chat
* Convert file upload to a plugin
  * make FileTree from shared/filetree.js extend EventRaiser
    * file added event when files + folders
    * file deleted event for files + folders
  * hook file upload hooks to folders through the file added event
    * don't ignore root as the event handler will probably be added after
      the event for the root is triggered
* Terminal
  * Close when the project is swapped, and if nothing was typed.
    * Probably best to write this through client side code.


## Plugin API

* convert to ES6 modules
* documentation