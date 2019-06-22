const AWS = require('aws-sdk');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

let lib;

// Number of seconds to expire the pre-signed URL, default is 180 (3 minutes)
const EXPIRES = 180;

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
  return new Promise((resolve, reject) => {
    return s3.createPresignedPost(params, (err, data) => {
      err ? reject(err) : resolve(data);
    });
  });
}

async function _createPresignedPost(path) {
  const params = {
    Bucket: process.env.bucket,
    Expires: lib.EXPIRES,
    Fields: {
      Key: path
    },
    Conditions: [
      { acl: 'public-read-write' },
      { success_action_status: '201' },
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

async function handler(event) {
  const path = event.pathParameters.proxy;
  console.log(`Received request for ${path}`);

  const data = await lib._createPresignedPost(path);
  console.log('Returning success');
  const clientDomain = process.env.clientDomain;
  const allowedDomain = clientDomain === '*' ? clientDomain : `${process.env.clientProtocol}://${clientDomain}`;

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedDomain,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  };
}

lib = {
  EXPIRES,

  _createPresignedPostPromise,
  _createPresignedPost,
  _createResponse,

  handler
};

module.exports = lib;
