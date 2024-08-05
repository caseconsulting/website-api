let lib;

async function handler(event) {
  console.log(event);
  console.log(event.Records[0].dynamodb);
  return event;
}

lib = {
  handler
};

module.exports = lib;
