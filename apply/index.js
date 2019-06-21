const AWS = require('aws-sdk');
const _ = require('lodash');
const uuid = require('uuid/v4');

let lib;

function _getDynamoDB() {
  return new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
}

function _parseData(body) {
  let data = {};
  if (_.get(body, 'firstName')) data.firstName = _.get(body, 'firstName');
  if (_.get(body, 'lastName')) data.lastName = _.get(body, 'lastName');
  if (_.get(body, 'email')) data.email = _.get(body, 'email');
  if (_.get(body, 'jobTitles')) data.jobTitles = _.join(_.get(body, 'jobTitles'));
  if (_.get(body, 'otherJobTitle')) data.otherJobTitle = _.get(body, 'otherJobTitle');
  if (_.get(body, 'hearAboutUs')) data.hearAboutUs = _.join(_.get(body, 'hearAboutUs'));
  if (_.get(body, 'otherHearAboutUs')) data.otherHearAboutUs = _.get(body, 'otherHearAboutUs');
  if (_.get(body, 'comments')) data.comments = _.get(body, 'comments');
  if (_.get(body, 'fileNames')) data.fileNames = _.join(_.get(body, 'fileNames'));
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
