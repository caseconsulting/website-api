const lib = require('../../upload/index');

describe('upload', () => {
  const get = 'GET';
  const put = 'PUT';
  const path = 'PATH';
  const bucketName = 'BUCKET_NAME';
  const url = 'URL';

  const params = {
    Bucket: bucketName,
    Key: path,
    Expires: lib.EXPIRES
  };

  beforeAll(() => (process.env.bucket = bucketName));

  describe('_getSignedUrl', () => {
    beforeEach(() => spyOn(lib, '_getSignedUrlPromise').and.returnValue(Promise.resolve(url)));
    afterEach(() => expect(lib._getSignedUrlPromise).toHaveBeenCalledWith('putObject', params));

    it('SHOULD return URL', async () => {
      const result = await lib._getSignedUrl(put, path);
      expect(result).toEqual(url);
    });
  }); // _getSignedUrl

  describe('handler', () => {
    let event;

    beforeEach(() => spyOn(lib, '_getSignedUrl').and.returnValue(Promise.resolve(url)));

    describe('WHEN method is PUT', () => {
      beforeEach(() => {
        event = {
          httpMethod: put,
          pathParameters: { proxy: path }
        };
      });

      afterEach(() => expect(lib._getSignedUrl).toHaveBeenCalledWith(put, path));

      it('SHOULD return 307 redirect', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(307);
        expect(result.headers.Location).toEqual(url);
      });
    });

    describe('WHEN method is not PUT', () => {
      beforeEach(() => {
        event = {
          httpMethod: get,
          pathParameters: { proxy: path }
        };
      });

      afterEach(() => expect(lib._getSignedUrl).not.toHaveBeenCalled());

      it('SHOULD return 405 error', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(405);
        expect(result.headers).toBeUndefined();
      });
    });
  }); // handler
});
