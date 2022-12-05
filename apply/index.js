const _ = require('lodash');
const moment = require('moment');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { v4: uuid } = require('uuid');

let lib;

function _getDynamoDB() {
  return DynamoDBDocumentClient.from(new DynamoDBClient({ apiVersion: '2012-08-10' }));
}

function _getSNS() {
  return new SNSClient({ apiVersion: '2010-03-31' });
}

function _parseData(body) {
  let data = {};

  if (_.get(body, 'firstName') && !_.isEmpty(body.firstName)) {
    data.firstName = body.firstName;
  } else {
    throw new Error('First name is required.');
  }
  if (_.get(body, 'lastName') && !_.isEmpty(body.lastName)) {
    data.lastName = body.lastName;
  } else {
    throw new Error('Last name is required.');
  }
  if (_.get(body, 'email') && !_.isEmpty(body.email)) {
    data.email = body.email;
  } else {
    throw new Error('Email is required.');
  }
  if (_.get(body, 'jobTitles') && !_.isEmpty(body.jobTitles)) {
    data.jobTitles = _.join(body.jobTitles);
    if (body.jobTitles.includes('Other')) {
      if (_.get(body, 'otherJobTitle') && !_.isEmpty(body.otherJobTitle)) {
        data.otherJobTitle = body.otherJobTitle;
      } else {
        throw new Error('Other Job Title is required.');
      }
    }
  } else {
    throw new Error('Job Title is required.');
  }
  if (_.get(body, 'hearAboutUs') && !_.isEmpty(body.hearAboutUs)) {
    data.hearAboutUs = _.join(body.hearAboutUs);
    if (body.hearAboutUs.includes('Other')) {
      if (_.get(body, 'otherHearAboutUs') && !_.isEmpty(body.otherHearAboutUs)) {
        data.otherHearAboutUs = body.otherHearAboutUs;
      } else {
        throw new Error('Other Hear About Us is required.');
      }
    }
    if (body.hearAboutUs.includes('Employee Referral')) {
      if (_.get(body, 'referralHearAboutUs') && !_.isEmpty(body.referralHearAboutUs)) {
        data.referralHearAboutUs = body.referralHearAboutUs;
      } else {
        throw new Error('Employee Referral Hear About Us is required.');
      }
    }
  }
  if (_.get(body, 'comments') && !_.isEmpty(body.comments)) data.comments = body.comments;
  if (_.get(body, 'fileNames') && !_.isEmpty(body.fileNames)) {
    if (body.fileNames.length == 1) {
      data.fileNames = _.join(body.fileNames);
    } else {
      throw new Error('Can only upload 1 file');
    }
  } else {
    throw new Error('Filename is required.');
  }
  if (!_.isEmpty(data)) data.submittedAt = moment().toISOString();
  if (_.get(body, 'id')) data.id = body.id;

  return data;
}

async function _putData(id, data) {
  const Item = _.merge({ id }, data);
  const params = {
    TableName: process.env.table,
    Item
  };
  console.log(`PUT: ${JSON.stringify(params)}`);
  return await lib._getDynamoDB().send(new PutCommand(params));
}

async function _publish(id, data) {
  let Message = '';
  Message += `
  New job application has been received from ${data.firstName} ${data.lastName} !

    Name: ${data.firstName} ${data.lastName}
    Email: ${data.email}
    Job Title(s): ${data.jobTitles.replace(/,/g, ', ')}`;
  if (data.otherJobTitle) {
    Message += `
    Other Job Titles: ${data.otherJobTitle}`;
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
    Employee Referral: ${data.referralHearAboutUs}`;
  }
  Message += `
    Resume Filenames: ${data.fileNames.replace(/,/g, ', ')}`;
  if (data.comments) {
    Message += `
    Other Comments: ${data.comments}`;
  }
  Message += `

    Links to Resume Files in S3:`;

  data.fileNames.split(',').forEach(function (element) {
    Message += `
      https://s3.amazonaws.com/${process.env.bucket}/${id}/${element.replace(/ /g, '%2520')}`;
  });

  const Subject = `New job application from ${data.firstName} ${data.lastName}`;
  const params = {
    TopicArn: process.env.topicArn,
    Message,
    Subject
  };
  console.log(`PUBLISH: ${JSON.stringify(params)}`);
  return await lib._getSNS().send(new PublishCommand(params));
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
  PutCommand,
  handler
};

module.exports = lib;
