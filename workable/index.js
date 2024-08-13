let lib;
const _ = require('lodash');
const axios = require('axios');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const ssmClient = new SSMClient({ region: 'us-east-1' });

const SUB_DOMAIN = 'case-consulting';
const MEMBER_ID = '191bc0'; // Chad's member ID for commenting on candidates
const BUCKET = process.env.bucket;

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

function _buildWorkableCandidate(jobApplication) {
  return {
    firstname: jobApplication.firstName,
    lastname: jobApplication.lastName,
    email: jobApplication.email,
    headline: jobApplication.jobTitles?.split(',')?.join(', '),
    resume_url: lib._getResumeURL(jobApplication.id, jobApplication.fileNames),
    domain: 'applied',
    stage: 'Applied',
    sourced: false
  };
} // _buildWorkableCandidate

function _buildWorkableCandidateComment(jobApplication) {
  let comment = 'Candidate generated through Workable API, originally submitted via CASE website.\n';
  comment += '\nJob application details:\n';
  _.forEach(jobApplication, (value, key) => {
    comment += `${key}: ${value}\n`;
  });
  return { comment: comment.trim(), member_id: MEMBER_ID };
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

async function _createCandidate(candidate, jobShortcode, token) {
  let options = {
    method: 'POST',
    url: `https://${SUB_DOMAIN}.workable.com/spi/v3/jobs/${jobShortcode}/candidates`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/plain',
      'Content-Type': 'application/json'
    },
    data: candidate
  };
  return await axios(options);
} // _createCandidate

async function _createCandidateComment(workableCandidate, comment, token) {
  let candidateId = workableCandidate?.id;
  let options = {
    method: 'POST',
    url: `https://${SUB_DOMAIN}.workable.com/spi/v3/candidates/${candidateId}/comments`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/plain',
      'Content-Type': 'application/json'
    },
    data: comment
  };
  return await axios(options);
}

function _getCandidateSummary(jobApplication) {
  let summary = '';
  _.forEach(jobApplication, (value, key) => {
    summary += `${key}: ${value}\n`;
  });
  return summary;
} // _getCandidateSummary

function _getResumeURL(jobApplicationId, fileName) {
  return `https://${BUCKET}.s3.amazonaws.com/${jobApplicationId}/${encodeURIComponent(encodeURIComponent(fileName))}`;
} // _getResumeURL

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

async function handler(event) {
  try {
    console.log(`Received event: ${JSON.stringify(event)}`);

    let token = await lib._getSecret('/Workable/AccessToken');
    console.log('Successfully retrieved Workable access token');

    let dynamoRecord = event?.Records?.[0]?.dynamodb?.NewImage || {};

    let jobApplication = lib._cleanJobApplicationData(dynamoRecord);

    let candidate = lib._buildWorkableCandidate(jobApplication);

    let jobShortcode = lib._getWorkableJobShortcode(jobApplication);

    let candidateResponse = await lib._createCandidate(candidate, jobShortcode, token);
    console.log('Successfully created a Workable candidate');

    let workableCandidate = candidateResponse.data.candidate;
    let comment = lib._buildWorkableCandidateComment(jobApplication);

    await lib._createCandidateComment(workableCandidate, comment, token);
    console.log('Successfully created a Workable comment for candidate ID: ' + workableCandidate.id);

    return {
      statusCode: 200,
      body: 'Successfully created a Workable candidate from job application submitted via CASE website'
    };
  } catch (err) {
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
  handler
};

module.exports = lib;
