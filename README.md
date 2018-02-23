# JoshDevelop

JoshDevelop is a web-based collaborative editor.


## Running

Make sure dependencies are installed using `npm install`, then run `npm start`.

You can then access the editor through a web browser using the address of the host machine
(http://localhost:8080 to access from the host machine by default).

Options: `npm start [port [passphrase]]`


## Security

To enable encryption, create a `certificate` folder and put your `cert.pem` and `key.pem` files inside. Make sure to pass the passphrase for the private key when starting the server (see `Options` in the `Running` section).

JoshDevelop will use HTTPS with TLS if a certificate is found, otherwise it will default to plain HTTP.


## Plugins

Many non-core components of JoshDevelop are in the plugins folder, in order to create a focused base.

To create a plugin, make a folder in the `plugins` folder and add a package.json that points to a `.mjs` file which exports a class that extends from the Plugin class in `src/server/Plugin.mjs`.

To disable a plugin, move/delete its folder or rename the package.json file associated with it and remove it from dependencies in the root package.json.


## Video

[![](screenshots/VideoIcon.png)](https://youtu.be/cCpkSRIdujA "Click to watch")

https://youtu.be/cCpkSRIdujA