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

  xdescribe('_verifyContentType', () => {
    // it('SHOULD return data', async () => {
    //   expect(lib._verifyContentType()).toEqual(`${clientProtocol}://${clientDomain}`);
    // });
  }); // _verifyContentType

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

  describe('_allowedDomain', () => {
    it('SHOULD return data', async () => {
      expect(lib._allowedDomain()).toEqual(`${clientProtocol}://${clientDomain}`);
    });
  }); // _allowedDomain

  describe('handler', () => {
    let event;

    describe('WHEN valid content type', () => {
      beforeEach(() => {
        event = {
          pathParameters: { proxy: path }
        };
      });

      beforeEach(() => spyOn(lib, '_verifyContentType').and.returnValue(true));
      afterEach(() => expect(lib._verifyContentType).toHaveBeenCalledWith(event));

      beforeEach(() => spyOn(lib, '_createPresignedPost').and.returnValue(Promise.resolve(data)));
      afterEach(() => expect(lib._createPresignedPost).toHaveBeenCalledWith(path));

      beforeEach(() => spyOn(lib, '_allowedDomain').and.returnValue('ALLOWED_DOMAIN'));
      afterEach(() => expect(lib._allowedDomain).toHaveBeenCalled());

      it('SHOULD return success', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(200);
        expect(JSON.parse(result.body)).toEqual(data);
        expect(result.headers).toEqual({
          'Access-Control-Allow-Origin': 'ALLOWED_DOMAIN',
          'Content-Type': 'application/json'
        });
      });
    }); // WHEN valid content type
  }); // handler
});
