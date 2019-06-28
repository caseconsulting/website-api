const AWS = require('aws-sdk');

const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

let lib;

// Content types that are allowed to be uploaded
const ALLOWED_CONTENT_TYPES = ['image/gif'];

// Number of seconds to expire the pre-signed URL, default is 180 (3 minutes)
const EXPIRES = 180;

function _verifyContentType(event) {
  const body = event.body;
  const requestContentType = event.headers['content-type'];
  const boundary = requestContentType.split('boundary=')[1];
  let contentType;

  // multipart/form-data boundaries begin with two hyphens
  // https://www.w3.org/TR/html401/interact/forms.html#h-17.13.4.2
  const parts = body
    .split('\r\n')
    .join('')
    .split(`--${boundary}`);
  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
    console.log(`@@@ part: ${part}`);
    if (part.includes('contentType')) {
      let pieces = part
        .split('\r\n')
        .join('')
        .split('"contentType"');
      console.log(`@@@ pieces: ${pieces.join(';')}`);
      contentType = pieces[1];
      console.log(`@@@ contentType: ${contentType}`);

      let filteredPart = part.replace('\r', '').replace('\n', '');
      console.log(`@@@ filteredPart: ${filteredPart}`);
      let match1 = filteredPart.match(/(?:\\"contentType\\")[a-zA-Z/]+/);
      console.log(`@@@ match1: ${match1}`);
      let match2 = filteredPart.match(/(?:"contentType")([a-zA-Z/])+/);
      console.log(`@@@ match1: ${match2}`);
    }
    // will be:
    // { filename: 'A.txt', type: 'text/plain',
    //		data: <Buffer 41 41 41 41 42 42 42 42> }
  }

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

function _allowedDomain() {
  const clientDomain = process.env.clientDomain;
  const allowedDomain = clientDomain === '*' ? clientDomain : `${process.env.clientProtocol}://${clientDomain}`;
  return allowedDomain;
}

async function handler(event) {
  const path = event.pathParameters.proxy;
  console.log(`Received request for ${path}`);

  if (lib._verifyContentType(event)) {
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

  _verifyContentType,
  _createResponse,
  _createPresignedPostPromise,
  _createPresignedPost,
  _allowedDomain,

  handler
};

module.exports = lib;
