## Core

* Multiple projects
  * alphabetical sort
* Keybind input
* See what file a user is in
  * Display that in the user list
    * Ability to request to go to that file at the exact same location
      through a click
      * A text editor would bring you to the line
      * An image editor would simply make their cursor more obvious
      * A "FollowUser" request seems like a good name
    * Only show the path, editors will handle details when requested
  * add to the User class as location
* Cleanup + tighten filetree/filemanager

## Plugin Additions

* Text Editor
  * File search (name + content)
* Image editor
  * Display other clients cursor location
  * Hiding layers
  * Create tool classes
* Chat
* Templates
  * When a file is created add pregenerated content based off of extension
* Convert file upload to a plugin
* Terminal
  * Close when the project is swapped, and if nothing was typed.
    * Probably best to write this through client side code.


## Plugin API

* convert to ES6 modules
* documentation



## Uncertain

## Core

* Login
  * get rid of current cookie system and save/load to server
  * registering should notify users marked as administrators and 
    require verification
  * admins should be able to give/withdraw privileges - such as terminal
    * privilege api for plugins