import Server from "./src/server/Server";
import initialSetup from "./initialSetup";
import fs from "fs";

function createServer()
{
  let options = {
    key: undefined,
    cert: undefined,
    passphrase: process.argv[3],
    port: parseInt(process.argv[2] || "8080")
  };

  try{
    options.key = fs.readFileSync("certificate/key.pem");
    options.cert = fs.readFileSync("certificate/cert.pem");
  } catch(err) {
    console.error("No certificate found, the server will use an insecure HTTP protocol.");
  }

  new Server(options);
}

initialSetup().then(() => createServer());
