let lib;
const _ = require('lodash');
const axios = require('axios');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ssmClient = new SSMClient({ region: 'us-east-1' });
const sesClient = new SESClient({ region: 'us-east-1' });

const SUB_DOMAIN = 'case-consulting';
const MEMBER_ID = '180e14'; // Caty's member ID for commenting on candidates
const BUCKET = process.env.bucket;
const STAGE = process.env.stage;

const LESS_COMMON_LCATS_SHORTCODE = 'C1B881D920';
const CI_CANDIDATES_SHORTCODE = '837457E467';
const INTERN_SHORTCODE = 'E0209C3651';

// Maps the job title from the CASE application to the Workable short code
const CASE_JOBS_MAP = {
  'TS/SCI with FSP': {
    'Software Developer': '0F032F1935',
    'Quality Assurance/Tester': 'FB7E117902',
    'Cloud Engineer': '39C80C619C',
    'Data Scientist': 'BA962320A5',
    'Project Manager': 'D1DAA969FD',
    'System Engineer': 'B5534DAEF8',
    Other: LESS_COMMON_LCATS_SHORTCODE
  },
  'TS/SCI with CI': {
    'Software Developer': '18BB0B9627',
    'Cloud Engineer': '08E66B2C76',
    'Data Scientist': CI_CANDIDATES_SHORTCODE,
    'Quality Assurance/Tester': CI_CANDIDATES_SHORTCODE,
    'Project Manager': CI_CANDIDATES_SHORTCODE,
    'System Engineer': CI_CANDIDATES_SHORTCODE,
    Other: CI_CANDIDATES_SHORTCODE
  }
};

/**
 * Builds the required fields needed to successfully submit a candidate to Workable's API.
 *
 * @returns Object - The candidate to create
 */
function _buildWorkableCandidate(jobApplication) {
  return {
    firstname: jobApplication.firstName,
    lastname: jobApplication.lastName,
    email: jobApplication.email,
    headline: jobApplication.jobTitles?.split(',')?.join(', '),
    resume_url: lib._getResumeURL(jobApplication.id, jobApplication.fileNames),
    domain: 'applied',
    stage: 'applied'
  };
} // _buildWorkableCandidate

/**
 * Builds the Workable Candidate comment from the job application submitted on the CASE website.
 *
 * @returns String - The comment to attach to the candidate
 */
function _buildWorkableCandidateComment(jobApplication) {
  let comment = 'Candidate generated through Workable API, originally submitted via CASE website.\n';
  comment += '\nJob application details:\n';
  _.forEach(jobApplication, (value, key) => {
    comment += `${key}: ${value}\n`;
  });
  return comment.trim();
} // _buildWorkableCandidateComment

/**
 * Cleans up the DynamoDB job application record from
 * { firstName: { S: 'John' } } TO firstName: "John"
 * @param {Object} jobApplicationRecord - The DynamoDB job application record
 */
function _cleanJobApplicationData(jobApplicationRecord) {
  let jobApplication = _.cloneDeep(jobApplicationRecord);
  _.forEach(jobApplication, (value, key) => {
    jobApplication[key] = _.values(value)[0];
  });
  return jobApplication;
} // _cleanJobApplicationData

/**
 * Creates a candidate from the CASE website job application using the Workable API.
 *
 * @returns Object - Workable's API response to the created candidate
 */
async function _createCandidate(candidate, jobShortcode, token) {
  let options = {
    method: 'POST',
    url: `https://${SUB_DOMAIN}.workable.com/spi/v3/jobs/${jobShortcode}/candidates`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/plain',
      'Content-Type': 'application/json'
    },
    data: { candidate, sourced: false }
  };
  return await axios(options);
} // _createCandidate

/**
 * Creates a comment for the newly created candidate. This has to wait a little since
 * Workable's system takes a little to process the candidate.
 *
 * @returns Object - Workable's API response to the created comment
 */
async function _createCandidateComment(workableCandidate, comment, token) {
  // waits 20 seconds to allow Workable api to be able to detect the newly created candidate
  return new Promise((resolve, reject) =>
    setTimeout(async () => {
      try {
        let candidateId = workableCandidate?.id;
        let options = {
          method: 'POST',
          url: `https://${SUB_DOMAIN}.workable.com/spi/v3/candidates/${candidateId}/comments`,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'text/plain',
            'Content-Type': 'application/json'
          },
          data: { member_id: MEMBER_ID, comment: { body: comment } }
        };
        let resp = await axios(options);
        resolve(resp);
      } catch (err) {
        reject(err);
      }
    }, 20000)
  );
} // _createCandidateComment

/**
 * Formats the website job application object to a readable string.
 *
 * @returns String - The job application in readable format
 */
function _getCandidateSummary(jobApplication) {
  let summary = '';
  _.forEach(jobApplication, (value, key) => {
    summary += `${key}: ${value}\n`;
  });
  return summary;
} // _getCandidateSummary

/**
 * Gets the link of the job application resume from AWS S3
 *
 * @returns String - The link to the job application resume
 */
function _getResumeURL(jobApplicationId, fileName) {
  return `https://${BUCKET}.s3.amazonaws.com/${jobApplicationId}/${encodeURIComponent(encodeURIComponent(fileName))}`;
} // _getResumeURL

/**
 * Gets the Workable job code based on the job application job title.
 *
 * @returns String - The Workable job shortcode
 */
function _getWorkableJobShortcode(jobApplication) {
  let shortcode;
  let clearance = jobApplication.clearance;
  if (jobApplication.jobTitles?.includes('Intern')) {
    shortcode = INTERN_SHORTCODE;
  } else {
    let jobTitle = jobApplication.jobTitles?.split(',')?.[0]; // get first job title if application has multiple
    shortcode = CASE_JOBS_MAP[clearance]?.[jobTitle] || LESS_COMMON_LCATS_SHORTCODE;
  }
  return shortcode;
} // _getWorkableJobShortcode

/*
 * Access system manager parameter store and return secret value of the given name.
 */
async function _getSecret(secretName) {
  const params = {
    Name: secretName,
    WithDecryption: true
  };
  const result = await ssmClient.send(new GetParameterCommand(params));
  return result.Parameter.Value;
} // _getSecret

/**
 * Sends an AWS SES email that an error has occurred somewhere in the process
 * of creating a Workable candidate or comment.
 */
async function _sendFailureEmail(err, jobApplication) {
  try {
    const source = process.env.sourceEmail;
    const destination = process.env.destinationEmail;
    if (source && destination) {
      const input = {
        Source: source,
        Destination: {
          ToAddresses: destination.split(',')
        },
        Message: {
          Body: {
            Text: {
              Charset: 'UTF-8',
              Data:
                `Error: ${JSON.stringify(err)}\n\n` +
                `Job Application:\n${lib._getCandidateSummary(jobApplication)}\n\n` +
                `Candidate Resume: ${lib._getResumeURL(jobApplication.id, jobApplication.fileNames)}`
            }
          },
          Subject: {
            Charset: 'UTF-8',
            Data: 'Failed to create Workable candidate from CASE website job application'
          }
        }
      };
      const command = new SendEmailCommand(input);
      await sesClient.send(command);
    }
  } catch (err) {
    console.error('EMAIL ERROR: ', err);
    console.log('Failed to send failure email.');
  }
} // _sendFailureEmail

/**
 * The entry point for the Lambda function.
 *
 * @returns Object - the functions response
 */
async function handler(event) {
  let jobApplication;
  try {
    console.log(`Received event: ${JSON.stringify(event)}`);

    // only create candidates on production environment
    if (STAGE === 'prod') {
      let token = await lib._getSecret('/Workable/AccessToken');
      console.log('Successfully retrieved Workable access token');

      let dynamoRecord = event?.Records?.[0]?.dynamodb?.NewImage || {};

      jobApplication = lib._cleanJobApplicationData(dynamoRecord);

      let candidate = lib._buildWorkableCandidate(jobApplication);

      let jobShortcode = lib._getWorkableJobShortcode(jobApplication);

      let candidateResponse = await lib._createCandidate(candidate, jobShortcode, token);
      console.log('Successfully created a Workable candidate');

      let workableCandidate = candidateResponse.data.candidate;
      let comment = lib._buildWorkableCandidateComment(jobApplication);

      await lib._createCandidateComment(workableCandidate, comment, token);
      console.log('Successfully created a Workable comment for candidate ID: ' + workableCandidate.id);
    }

    return {
      statusCode: 200,
      body: 'Successfully created a Workable candidate from job application submitted via CASE website'
    };
  } catch (err) {
    await lib._sendFailureEmail(err, jobApplication);
    console.error('ERROR: ', err);
    console.log('Returning failure');
  }
} // handler

lib = {
  _buildWorkableCandidate,
  _buildWorkableCandidateComment,
  _cleanJobApplicationData,
  _createCandidate,
  _createCandidateComment,
  _getCandidateSummary,
  _getResumeURL,
  _getWorkableJobShortcode,
  _getSecret,
  _sendFailureEmail,
  handler
};

module.exports = lib;
