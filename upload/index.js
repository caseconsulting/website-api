const multipart = require('aws-lambda-multipart-parser');
const { createPresignedPost } = require('@aws-sdk/s3-presigned-post');
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({});

let lib;

// Content types that are allowed to be uploaded
const ALLOWED_CONTENT_TYPES = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// Number of seconds to expire the pre-signed URL, default is 180 (3 minutes)
const EXPIRES = 180;

function _getMultipartParser() {
  return multipart;
}

function _validateContentType(event) {
  const body = lib._getMultipartParser().parse(event, false);
  const contentType = body ? body.contentType : undefined;
  console.log(`contentType: ${contentType}`);
  return lib.ALLOWED_CONTENT_TYPES.includes(contentType);
}

function _createResponse(data) {
  const signature = Object.assign(
    {
      'Content-Type': '',
      acl: 'public-read-write',
      success_action_status: '201'
    },
    data.fields
  );
  const response = {
    signature,
    postEndpoint: data.url
  };
  return response;
}

// NOTE: See https://github.com/aws/aws-sdk-js/issues/1008#issuecomment-385502545
//       S3 Get Signed URL (and Create Presigned Post) accept callback but not promise.
async function _createPresignedPostPromise(params) {
  return await createPresignedPost(s3, params);
}

async function _createPresignedPost(path) {
  const params = {
    Bucket: process.env.bucket,
    Expires: lib.EXPIRES,
    Key: path,
    Fields: {
      acl: 'public-read-write',
      success_action_status: '201'
    },
    Conditions: [
      ['starts-with', '$Content-Type', ''],
      ['starts-with', '$key', '']
    ]
  };
  try {
    const data = await lib._createPresignedPostPromise(params);
    return lib._createResponse(data);
  } catch (err) {
    console.error('ERROR:', err);
    throw err;
  }
}

function _allowedDomain() {
  const clientDomain = process.env.clientDomain;
  const allowedDomain = clientDomain === '*' ? clientDomain : `${process.env.clientProtocol}://${clientDomain}`;
  return allowedDomain;
}

async function handler(event) {
  const path = event.pathParameters.proxy;
  console.log(`Received request for ${path}`);

  if (lib._validateContentType(event)) {
    const data = await lib._createPresignedPost(path);
    console.log('Returning success');
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': lib._allowedDomain(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    };
  } else {
    console.log('Returning failure');
    return {
      statusCode: 415,
      headers: {
        'Access-Control-Allow-Origin': lib._allowedDomain(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'File type not allowed'
      })
    };
  }
}

lib = {
  ALLOWED_CONTENT_TYPES,
  EXPIRES,

  _getMultipartParser,
  _validateContentType,
  _createResponse,
  _createPresignedPostPromise,
  _createPresignedPost,
  _allowedDomain,

  handler
};

module.exports = lib;
