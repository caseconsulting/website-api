require('dotenv').config({ path: './.backend-testing-env' }); //sets up enviornment variables

const fs = require('fs');

console.log('\n---------------------------START--------------------------\n');
console.log('⌛️ INITIALIZING ..\n');

//creates function called path to that directs to file location
const pathTo = (file) => require('./' + file);

//function to print final response
function done(result) {
  console.log('\n****************************\n');
  console.log('\n 🏁 Response 🏁 :');
  console.log(JSON.stringify(result));
  console.log('\n---------------------------DONE---------------------------\n');
}

//list of lambda parent folder names
const lambdas = {
  apply: { function: pathTo('apply/index.js'), event: 'events/apply.json' },
  upload: { function: pathTo('upload/index.js'), event: 'events/upload.json' }
};

//reads arguments
let i = 0;
process.argv[i++]; // nodeName
process.argv[i++]; // cliName
const lambdaName = process.argv[i++];

//checks to see if there is a valid parameter
if (!lambdaName || !Object.keys(lambdas).includes(lambdaName)) {
  let output = lambdaName
    ? `${lambdaName} is not a valid parameter option.`
    : 'This function takes at least 1 parameter.';
  console.log(output + ' Here is a list of Valid Parameter Options:');
  console.log(Object.keys(lambdas));
  console.log();
} else {
  //retrieve function path and event file name from list of lambdas based on user key input
  const lambdaFile = lambdas[lambdaName].function;
  const eventFile = lambdas[lambdaName].event;

  //parses event file into JSON
  const event = JSON.parse(fs.readFileSync(eventFile, 'utf-8'));
  //sets context for function call
  const context = {};

  console.log(`🚗 INVOKING: ${lambdaName}`);
  console.log('\n****************************\n');
  console.log('\t🖨  OUTPUTS 🖨 :\n');

  //promise chain for testing code and printing out status
  lambdaFile.handler(event, context).then(done);
}
