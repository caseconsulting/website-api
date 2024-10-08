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

  describe('_validateContentType', () => {
    let event, contentType, parserObj;
    beforeEach(() => (event = {}));

    beforeEach(() => (parserObj = jasmine.createSpyObj('parser', ['parse'])));
    beforeEach(() => spyOn(lib, '_getMultipartParser').and.returnValue(parserObj));
    afterEach(() => expect(parserObj.parse).toHaveBeenCalledWith(event, false));

    describe('WHEN pdf', () => {
      beforeEach(() => (contentType = 'application/pdf'));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return true', async () => {
        expect(lib._validateContentType(event)).toEqual(true);
      });
    }); // WHEN pdf

    describe('WHEN doc', () => {
      beforeEach(() => (contentType = 'application/msword'));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return true', async () => {
        expect(lib._validateContentType(event)).toEqual(true);
      });
    }); // WHEN doc

    describe('WHEN docx', () => {
      beforeEach(() => (contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return true', async () => {
        expect(lib._validateContentType(event)).toEqual(true);
      });
    }); // WHEN docx

    describe('WHEN rtf', () => {
      beforeEach(() => (contentType = 'application/rtf'));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return true', async () => {
        expect(lib._validateContentType(event)).toEqual(true);
      });
    }); // WHEN docx

    describe('WHEN other', () => {
      beforeEach(() => (contentType = 'application/other'));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return false', async () => {
        expect(lib._validateContentType(event)).toEqual(false);
      });
    }); // WHEN other

    describe('WHEN unknown', () => {
      beforeEach(() => (contentType = undefined));
      beforeEach(() => parserObj.parse.and.returnValue({ contentType }));

      it('SHOULD return false', async () => {
        expect(lib._validateContentType(event)).toEqual(false);
      });
    }); // WHEN unknown
  }); // _validateContentType

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
    beforeEach(() => {
      event = {
        pathParameters: { proxy: path }
      };
    });

    beforeEach(() => spyOn(lib, '_createPresignedPost').and.returnValue(Promise.resolve(data)));

    beforeEach(() => spyOn(lib, '_allowedDomain').and.returnValue('ALLOWED_DOMAIN'));
    afterEach(() => expect(lib._allowedDomain).toHaveBeenCalled());

    describe('WHEN valid content type', () => {
      beforeEach(() => spyOn(lib, '_validateContentType').and.returnValue(true));
      afterEach(() => expect(lib._validateContentType).toHaveBeenCalledWith(event));

      afterEach(() => expect(lib._createPresignedPost).toHaveBeenCalledWith(path));

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

    describe('WHEN invalid content type', () => {
      beforeEach(() => spyOn(lib, '_validateContentType').and.returnValue(false));
      afterEach(() => expect(lib._validateContentType).toHaveBeenCalledWith(event));

      afterEach(() => expect(lib._createPresignedPost).not.toHaveBeenCalled());

      it('SHOULD return error', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(415);
        expect(JSON.parse(result.body)).toEqual({
          message: 'File type not allowed'
        });
        expect(result.headers).toEqual({
          'Access-Control-Allow-Origin': 'ALLOWED_DOMAIN',
          'Content-Type': 'application/json'
        });
      });
    }); // WHEN invalid content type
  }); // handler
});
