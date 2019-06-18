const AWS = require('aws-sdk');
const _ = require('lodash');
const uuid = require('uuid/v4');

const dynamodb = new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });

let lib;

async function _putData(id, data) {
  const Item = _.join({ id }, data);
  const params = {
    TableName: process.env.table,
    Item
  };
  console.log(`PUT: ${JSON.stringify(params)}`); // eslint-disable-line no-console
  return await dynamodb.put(params).promise();
}

async function handler(event) {
  console.log(`Received event ${JSON.stringify(event)}`); // eslint-disable-line no-console
  const id = uuid();
  console.log(`Generated ID: ${id}`); // eslint-disable-line no-console
  try {
    const response = await lib._putData(id, event);
    if (response.data) {
      return {
        statusCode: 200,
        body: {
          id,
          message: 'Submission was successful'
        }
      };
    } else {
      console.log(response.err); // eslint-disable-line no-console
    }
  } catch (err) {
    console.log(err); // eslint-disable-line no-console
  }
}

lib = {
  _putData,

  handler
};

module.exports = lib;
