const AWS = require('aws-sdk');
const _ = require('lodash');
const moment = require('moment');
const uuid = require('uuid/v4');

let lib;

function _getDynamoDB() {
  return new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
}

function _parseData(body) {
  let data = {};
  if (_.get(body, 'firstName') && !_.isEmpty(body.firstName)) data.firstName = body.firstName;
  if (_.get(body, 'lastName') && !_.isEmpty(body.lastName)) data.lastName = body.lastName;
  if (_.get(body, 'email') && !_.isEmpty(body.email)) data.email = body.email;
  if (_.get(body, 'jobTitles') && !_.isEmpty(body.jobTitles)) data.jobTitles = _.join(body.jobTitles);
  if (_.get(body, 'otherJobTitle') && !_.isEmpty(body.otherJobTitle)) data.otherJobTitle = body.otherJobTitle;
  if (_.get(body, 'hearAboutUs') && !_.isEmpty(body.hearAboutUs)) data.hearAboutUs = _.join(body.hearAboutUs);
  if (_.get(body, 'otherHearAboutUs') && !_.isEmpty(body.otherHearAboutUs)) {
    data.otherHearAboutUs = body.otherHearAboutUs;
  }
  if (_.get(body, 'comments') && !_.isEmpty(body.comments)) data.comments = body.comments;
  if (_.get(body, 'fileNames') && !_.isEmpty(body.fileNames)) data.fileNames = _.join(body.fileNames);
  if (!_.isEmpty(data)) data.submittedAt = moment().toISOString();
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
    const clientDomain = process.env.clientDomain;
    const allowedDomain = clientDomain === '*' ? clientDomain : `${process.env.clientProtocol}://${clientDomain}`;
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedDomain,
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
