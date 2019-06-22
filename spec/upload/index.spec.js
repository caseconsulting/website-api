const lib = require('../../upload/index');

describe('upload', () => {
  const bucketName = 'BUCKET_NAME';
  const clientDomain = 'CLIENT_DOMAIN';
  const clientProtocol = 'https';

  const path = 'PATH';
  const url = 'URL';

  const params = {
    Bucket: bucketName,
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

  const presignedPost = {
    fields: {
      Key: path
    },
    url
  };

  const data = {
    signature: {
      'Content-Type': '',
      acl: 'public-read-write',
      success_action_status: '201',
      Key: path
    },
    postEndpoint: url
  };

  beforeAll(() => (process.env.bucket = bucketName));
  beforeAll(() => (process.env.clientDomain = clientDomain));
  beforeAll(() => (process.env.clientProtocol = clientProtocol));

  describe('_createResponse', () => {
    it('SHOULD return data', () => {
      expect(lib._createResponse(presignedPost)).toEqual(data);
    });
  }); // _createResponse

  describe('_createPresignedPost', () => {
    beforeEach(() => spyOn(lib, '_createPresignedPostPromise').and.returnValue(Promise.resolve(presignedPost)));
    afterEach(() => expect(lib._createPresignedPostPromise).toHaveBeenCalledWith(params));

    beforeEach(() => spyOn(lib, '_createResponse').and.returnValue(data));
    afterEach(() => expect(lib._createResponse).toHaveBeenCalledWith(presignedPost));

    it('SHOULD return data', async () => {
      const result = await lib._createPresignedPost(path);
      expect(result).toEqual(data);
    });
  }); // _createPresignedPost

  describe('handler', () => {
    let event;

    beforeEach(() => spyOn(lib, '_createPresignedPost').and.returnValue(Promise.resolve(data)));

    beforeEach(() => {
      event = {
        pathParameters: { proxy: path }
      };
    });

    afterEach(() => expect(lib._createPresignedPost).toHaveBeenCalledWith(path));

    it('SHOULD return success', async () => {
      const result = await lib.handler(event);

      expect(result.statusCode).toEqual(200);
      expect(JSON.parse(result.body)).toEqual(data);
      expect(result.headers).toEqual({
        'Access-Control-Allow-Origin': `${clientProtocol}://${clientDomain}`,
        'Content-Type': 'application/json'
      });
    });
  }); // handler
});
