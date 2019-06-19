const lib = require('../../apply/index');

const _ = require('lodash');

describe('apply', () => {
  const tableName = 'TABLE_NAME';

  const id = 'id';
  const data = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    jobTitles: ['jobTitle1', 'jobTitle2'],
    otherJobTitle: 'otherJobTitle',
    hearAboutUs: ['where1'],
    otherHearAboutUs: 'otherHearAboutUs',
    comments: 'comments'
  };

  beforeAll(() => (process.env.table = tableName));

  describe('_parseData', () => {
    let body;

    describe('WHEN body is undefined', () => {
      beforeEach(() => (body = undefined));

      it('SHOULD return empty object', async () => {
        const result = await lib._parseData(body);
        expect(result).toEqual({});
      });
    });

    describe('WHEN body is empty', () => {
      beforeEach(() => (body = {}));

      it('SHOULD return empty object', async () => {
        const result = await lib._parseData(body);
        expect(result).toEqual({});
      });
    });

    describe('WHEN body contains data', () => {
      beforeEach(() => (body = _.merge({ extraneous: 'extraneous' }, data)));

      it('SHOULD return object with parsed data', async () => {
        const response = _.merge(_.omit(data, ['jobTitles', 'hearAboutUs']), {
          jobTitles: _.join(data.jobTitles),
          hearAboutUs: _.join(data.hearAboutUs)
        });
        const result = await lib._parseData(body);
        expect(result).toEqual(response);
      });
    });
  }); // _parseData

  describe('_putData', () => {
    let promiseObj, dynamodbObj;

    beforeEach(() => {
      promiseObj = jasmine.createSpyObj('promise', ['promise']);
      promiseObj.promise.and.returnValue(Promise.resolve({}));
      dynamodbObj = jasmine.createSpyObj('dynamodb', ['put']);
      dynamodbObj.put.and.returnValue(promiseObj);
      spyOn(lib, '_getDynamoDB').and.returnValue(dynamodbObj);
    });

    afterEach(() => {
      expect(dynamodbObj.put).toHaveBeenCalledWith({
        TableName: tableName,
        Item: _.merge({ id }, data)
      });
    });

    it('SHOULD return empty object', async () => {
      const result = await lib._putData(id, data);
      expect(result).toEqual({});
    });
  }); // _putData

  describe('handler', () => {
    let event;

    beforeEach(() => (event = { body: JSON.stringify(data) }));

    beforeEach(() => spyOn(lib, '_parseData').and.returnValue(data));
    afterEach(() => expect(lib._parseData).toHaveBeenCalledWith(data));

    afterEach(() => expect(lib._putData).toHaveBeenCalledWith(jasmine.any(String), data));

    describe('WHEN no error thrown', () => {
      beforeEach(() => spyOn(lib, '_putData').and.returnValue({}));

      it('SHOULD return 200 success', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(200);
        expect(JSON.parse(result.body)).toEqual({
          id: jasmine.any(String),
          message: 'Submission was successful'
        });
      });
    });

    describe('WHEN error thrown', () => {
      beforeEach(() => spyOn(lib, '_putData').and.returnValue(new Error('something')));

      it('SHOULD rethrow error', async () => {
        try {
          await lib.handler(event);
        } catch (err) {
          expect(err.message).toEqual('something');
        }
      });
    });
  }); // handler
});