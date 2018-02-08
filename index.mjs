import Server from "./src/server/Server";

let port = parseInt(process.argv[2] || "8080");

new Server(port);