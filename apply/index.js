const AWS = require('aws-sdk');
const _ = require('lodash');
const uuid = require('uuid/v4');

let lib;

function _getDynamoDB() {
  return new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
}

function _parseData(body) {
  let data = {};
  if (body.firstName) data.firstName = body.firstName;
  if (body.lastName) data.lastName = body.lastName;
  if (body.email) data.email = body.email;
  if (body.jobTitles) data.jobTitles = body.jobTitles; // _.join(body.jobTitles, ', ')
  if (body.otherJobTitle) data.otherJobTitle = body.otherJobTitle;
  if (body.hearAboutUs) data.hearAboutUs = body.hearAboutUs; // _.join(body.hearAboutUs, ', ')
  if (body.comments) data.comments = body.comments;
  return data;
}

async function _putData(id, data) {
  const Item = _.merge({ id }, data);
  const params = {
    TableName: process.env.table,
    Item
  };
  console.log(`PUT: ${JSON.stringify(params)}`);
  return await lib
    ._getDynamoDB()
    .put(params)
    .promise();
}

async function handler(event) {
  try {
    console.log(`Received event: ${JSON.stringify(event)}`);

    const body = JSON.parse(event.body);
    console.log(`body: ${JSON.stringify(body)}`);

    const id = uuid();
    console.log(`Generated ID: ${id}`);

    const data = lib._parseData(body);

    await lib._putData(id, data);
    console.log('Returning success');
    const responseBody = {
      id,
      message: 'Submission was successful'
    };
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseBody)
    };
  } catch (err) {
    console.error('ERROR:', err);
    throw err;
  }
}

lib = {
  _getDynamoDB,
  _parseData,
  _putData,

  handler
};

module.exports = lib;
