const AWS = require('aws-sdk');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

let lib;

// Number of seconds to expire the pre-signed URL, default is 180 (3 minutes)
const EXPIRES = 180;

const METHOD_OPERATIONS = new Map([['PUT', 'putObject']]);

// NOTE: See https://github.com/aws/aws-sdk-js/issues/1008#issuecomment-385502545
//           [S3 Get Signed URL accepts callback but not promise]
async function _getSignedUrlPromise(operation, params) {
  return new Promise((resolve, reject) => {
    return s3.getSignedUrl(operation, params, (err, url) => {
      err ? reject(err) : resolve(url);
    });
  });
}

async function _getSignedUrl(method, path) {
  const operation = lib.METHOD_OPERATIONS.get(method);
  const params = {
    Bucket: process.env.bucket,
    Key: path,
    Expires: lib.EXPIRES
  };
  return await lib._getSignedUrlPromise(operation, params);
}

async function handler(event) {
  const method = event.httpMethod;
  const path = event.pathParameters.proxy;
  console.log(`Received ${method} request for ${path}`);

  if (lib.METHOD_OPERATIONS.get(method)) {
    const url = await lib._getSignedUrl(method, path);
    return {
      statusCode: 307,
      headers: {
        'Access-Control-Allow-Origin': `'${process.env.clientDomain}'`,
        Location: url
      }
    };
  } else {
    return {
      statusCode: 405
    };
  }
}

lib = {
  EXPIRES,
  METHOD_OPERATIONS,

  _getSignedUrlPromise,
  _getSignedUrl,

  handler
};

module.exports = lib;
