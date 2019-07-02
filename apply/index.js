const AWS = require('aws-sdk');
const _ = require('lodash');
const moment = require('moment');
const uuid = require('uuid/v4');

let lib;

function _getDynamoDB() {
  return new AWS.DynamoDB.DocumentClient({ apiVersion: '2012-08-10' });
}

function _getSNS() {
  return new AWS.SNS({ apiVersion: '2010-03-31' });
}

function _parseData(body) {
  let data = {};
  if (_.get(body, 'firstName') && !_.isEmpty(body.firstName)) data.firstName = body.firstName;
  if (_.get(body, 'lastName') && !_.isEmpty(body.lastName)) data.lastName = body.lastName;
  if (_.get(body, 'email') && !_.isEmpty(body.email)) data.email = body.email;
  if (_.get(body, 'jobTitles') && !_.isEmpty(body.jobTitles)) data.jobTitles = _.join(body.jobTitles);
  if (_.get(body, 'otherJobTitle') && !_.isEmpty(body.otherJobTitle)) data.otherJobTitle = body.otherJobTitle;
  if (_.get(body, 'hearAboutUs') && !_.isEmpty(body.hearAboutUs)) data.hearAboutUs = _.join(body.hearAboutUs);
  if (_.get(body, 'referralHearAboutUs') && !_.isEmpty(body.referralHearAboutUs)) {
    data.referralHearAboutUs = body.referralHearAboutUs;
  }
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

async function _publish(id, data) {
  let Message = '';
  Message += `New job application has been received from ${data.firstName} ${data.lastName} !

    Name: ${data.firstName} ${data.lastName}
    Email: ${data.email}
    Job Title(s): ${data.jobTitles.replace(/,/g, ', ')}`;
  if (data.otherJobTitle) {
    Message += `
    Other Job Titles?: ${data.otherJobTitle}`;
  }
  if (data.hearAboutUs && data.otherHearAboutUs) {
    Message += `
    How they heard about Case: ${data.hearAboutUs.replace(/,/g, ', ')}, ${data.otherHearAboutUs}`;
  } else if (data.hearAboutUs) {
    Message += `
    How they heard about Case: ${data.hearAboutUs.replace(/,/g, ', ')}`;
  }
  if (data.referralHearAboutUs) {
    Message += `
    Employee Referral?: ${data.referralHearAboutUs}`;
  }
  Message += `
    Resume Filenames in S3: ${data.fileNames.replace(/,/g, ', ')}`;
  if (data.comments) {
    Message += `
    Other Comments: ${data.comments}`;
  }

  const Subject = `New job application from ${data.firstName} ${data.lastName}`;
  const params = {
    TopicArn: process.env.topicArn,
    Message,
    Subject
  };
  console.log(`PUBLISH: ${JSON.stringify(params)}`);
  return await lib
    ._getSNS()
    .publish(params)
    .promise();
}

function _allowedDomain() {
  const clientDomain = process.env.clientDomain;
  const allowedDomain = clientDomain === '*' ? clientDomain : `${process.env.clientProtocol}://${clientDomain}`;
  return allowedDomain;
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
    await lib._publish(id, data);

    console.log('Returning success');
    const responseBody = {
      id,
      message: 'Submission was successful'
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': lib._allowedDomain(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(responseBody)
    };
  } catch (err) {
    console.error('ERROR:', err);
    console.log('Returning failure');
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': lib._allowedDomain(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
}

lib = {
  _getDynamoDB,
  _getSNS,
  _parseData,
  _putData,
  _publish,
  _allowedDomain,

  handler
};

module.exports = lib;
