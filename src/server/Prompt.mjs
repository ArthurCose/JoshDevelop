import readline from "readline";

export async function prompt(question)
{
  const readlineIO = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let promise = new Promise((resolve, reject) => 
    readlineIO.question(question, resolve)
  );

  let response = await promise;

  readlineIO.close();

  return response;
}

export async function sensitivePrompt(question, mask = "")
{
  const readlineIO = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let promise = new Promise((resolve, reject) => 
    readlineIO.question(question, resolve)
  );

  readlineIO._writeToOutput = (output) => {
    if(output != "\r\n" && output != question)
      output = mask;

    readlineIO.output.write(output);
  }

  let response = await promise;

  readlineIO.close();

  return promise;
}
