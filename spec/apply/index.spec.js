const lib = require('../../apply/index');

const _ = require('lodash');

describe('apply', () => {
  const clientDomain = 'CLIENT_DOMAIN';
  const clientProtocol = 'https';
  const tableName = 'TABLE_NAME';

  //const id = 'id';
  const data = {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    jobTitles: ['jobTitle1', 'jobTitle2', 'Other'],
    clearance: 'clearance',
    otherJobTitle: 'otherJobTitle',
    hearAboutUs: ['where1', 'Other', 'Employee Referral'],
    otherHearAboutUs: 'otherHearAboutUs',
    referralHearAboutUs: 'referralHearAboutUs',
    comments: 'comments',
    fileNames: ['resume.pdf']
  };

  beforeAll(() => (process.env.clientDomain = clientDomain));
  beforeAll(() => (process.env.clientProtocol = clientProtocol));
  beforeAll(() => (process.env.table = tableName));

  describe('_parseData', () => {
    let body;

    describe('WHEN body is undefined', () => {
      beforeEach(() => (body = undefined));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('First name is required.');
        }
      });
    });

    describe('WHEN body is empty', () => {
      beforeEach(() => (body = {}));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('First name is required.');
        }
      });
    });

    describe('WHEN body contains data with empty values', () => {
      beforeEach(
        () =>
          (body = {
            firstName: '',
            lastName: '',
            email: '',
            jobTitles: [],
            otherJobTitle: '',
            hearAboutUs: [],
            otherHearAboutUs: '',
            referralHearAboutUs: '',
            comments: '',
            fileNames: []
          })
      );

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('First name is required.');
        }
      });
    });

    describe('WHEN body contains data', () => {
      beforeEach(() => (body = _.merge({ extraneous: 'extraneous' }, data)));

      it('SHOULD return object with parsed data', async () => {
        const result = await lib._parseData(body);
        const response = _.merge(_.omit(data, ['jobTitles', 'hearAboutUs', 'fileNames']), {
          jobTitles: _.join(data.jobTitles),
          hearAboutUs: _.join(data.hearAboutUs),
          fileNames: _.join(data.fileNames),
          submittedAt: jasmine.any(String)
        });
        expect(result).toEqual(response);
      });
    });

    describe('WHEN body doesnt contain first name', () => {
      beforeEach(() => (body = _.omit(data, ['firstName'])));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('First name is required.');
        }
      });
    });

    describe('WHEN body doesnt contain last name', () => {
      beforeEach(() => (body = _.omit(data, ['lastName'])));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('Last name is required.');
        }
      });
    });

    describe('WHEN body doesnt contain email', () => {
      beforeEach(() => (body = _.omit(data, ['email'])));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('Email is required.');
        }
      });
    });

    describe('WHEN body doesnt contain job title', () => {
      beforeEach(() => (body = _.omit(data, ['jobTitles'])));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('Job Title is required.');
        }
      });
    });

    describe('WHEN body requires other job title', () => {
      describe('WHEN body doesnt contain other job title', () => {
        beforeEach(() => (body = _.omit(data, ['otherJobTitle'])));
        it('SHOULD throw an error', async () => {
          try {
            await lib._parseData(body);
            fail('should not get here');
          } catch (error) {
            expect(error.message).toEqual('Other Job Title is required.');
          }
        });
      });
    });

    describe('WHEN body doesnt contain hear about us', () => {
      beforeEach(() => (body = _.omit(data, ['hearAboutUs'])));
      it('SHOULD return object with parsed data and no hear about us', async () => {
        const result = await lib._parseData(body);
        const response = _.merge(
          _.omit(data, ['jobTitles', 'hearAboutUs', 'fileNames', 'otherHearAboutUs', 'referralHearAboutUs']),
          {
            jobTitles: _.join(data.jobTitles),
            fileNames: _.join(data.fileNames),
            submittedAt: jasmine.any(String)
          }
        );
        expect(result).toEqual(response);
      });
    });

    describe('WHEN body requires other hear about us', () => {
      describe('WHEN body doesnt contain other hear about us', () => {
        beforeEach(() => (body = _.omit(data, ['otherHearAboutUs'])));
        it('SHOULD throw an error', async () => {
          try {
            await lib._parseData(body);
            fail('should not get here');
          } catch (error) {
            expect(error.message).toEqual('Other Hear About Us is required.');
          }
        });
      });
    });

    describe('WHEN body requires referral hear about us', () => {
      describe('WHEN body doesnt contain referral hear about us', () => {
        beforeEach(() => (body = _.omit(data, ['referralHearAboutUs'])));
        it('SHOULD throw an error', async () => {
          try {
            await lib._parseData(body);
            fail('should not get here');
          } catch (error) {
            expect(error.message).toEqual('Employee Referral Hear About Us is required.');
          }
        });
      });
    });

    // describe('WHEN body doesnt contain referral hear about us', () => {
    //   beforeEach(() => (body = _.omit(data, ['referralHearAboutUs'])));
    //   it('SHOULD return object with parsed data and no referral hear about us', async () => {
    //     const result = await lib._parseData(body);
    //     const response = _.merge(_.omit(data, ['referralHearAboutUs', 'jobTitles', 'hearAboutUs', 'fileNames']), {
    //       jobTitles: _.join(data.jobTitles),
    //       hearAboutUs: _.join(data.hearAboutUs),
    //       fileNames: _.join(data.fileNames),
    //       submittedAt: jasmine.any(String)
    //     });
    //     expect(result).toEqual(response);
    //   });
    // });

    // describe('WHEN body doesnt contain other hear about us', () => {
    //   beforeEach(() => (body = _.omit(data, ['otherHearAboutUs'])));
    //   it('SHOULD return object with parsed data and no other hear about us', async () => {
    //     const result = await lib._parseData(body);
    //     const response = _.merge(_.omit(data, ['otherHearAboutUs', 'jobTitles', 'hearAboutUs', 'fileNames']), {
    //       jobTitles: _.join(data.jobTitles),
    //       hearAboutUs: _.join(data.hearAboutUs),
    //       fileNames: _.join(data.fileNames),
    //       submittedAt: jasmine.any(String)
    //     });
    //     expect(result).toEqual(response);
    //   });
    // });

    describe('WHEN body doesnt contain filename', () => {
      beforeEach(() => (body = _.omit(data, ['fileNames'])));

      it('SHOULD throw an error', async () => {
        try {
          await lib._parseData(body);
          fail('should not get here');
        } catch (error) {
          expect(error.message).toEqual('Filename is required.');
        }
      });
    });

    describe('WHEN body doesnt contain comments', () => {
      beforeEach(() => (body = _.omit(data, ['comments'])));
      it('SHOULD return object with parsed data and no comments', async () => {
        const result = await lib._parseData(body);
        const response = _.merge(_.omit(data, ['comments', 'jobTitles', 'hearAboutUs', 'fileNames']), {
          jobTitles: _.join(data.jobTitles),
          hearAboutUs: _.join(data.hearAboutUs),
          fileNames: _.join(data.fileNames),
          submittedAt: jasmine.any(String)
        });
        expect(result).toEqual(response);
      });
    });
  }); // _parseData

  // describe('_putData', () => {
  //   let dynamodbObj;

  //   beforeEach(() => {
  //     dynamodbObj = jasmine.createSpyObj('dynamodb', ['send']);
  //     spyOn(lib, '_getDynamoDB').and.returnValue(dynamodbObj);
  //   });

  //   afterEach(() => {
  //     expect(dynamodbObj.send).toHaveBeenCalledWith(
  //       new lib.PutCommand({
  //         TableName: tableName,
  //         Item: _.merge({ id }, data)
  //       })
  //     );
  //   });

  //   it('SHOULD return empty object', async () => {
  //     const result = await lib._putData(id, data);
  //     expect(result).toEqual({});
  //   });
  // }); // _putData

  describe('_allowedDomain', () => {
    it('SHOULD return data', async () => {
      expect(lib._allowedDomain()).toEqual(`${clientProtocol}://${clientDomain}`);
    });
  }); // _allowedDomain

  describe('handler', () => {
    let event;

    beforeEach(() => (event = { body: JSON.stringify(data) }));

    beforeEach(() => spyOn(lib, '_parseData').and.returnValue(data));
    afterEach(() => expect(lib._parseData).toHaveBeenCalledWith(data));

    afterEach(() => expect(lib._putData).toHaveBeenCalledWith(jasmine.any(String), data));

    beforeEach(() => spyOn(lib, '_publish').and.returnValue({}));

    beforeEach(() => spyOn(lib, '_allowedDomain').and.returnValue('ALLOWED_DOMAIN'));
    afterEach(() => expect(lib._allowedDomain).toHaveBeenCalled());

    describe('WHEN no error thrown', () => {
      beforeEach(() => spyOn(lib, '_putData').and.returnValue({}));

      afterEach(() => expect(lib._publish).toHaveBeenCalledWith(jasmine.any(String), data));

      it('SHOULD return success', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(200);
        expect(JSON.parse(result.body)).toEqual({
          id: jasmine.any(String),
          message: 'Submission was successful'
        });
        expect(result.headers).toEqual({
          'Access-Control-Allow-Origin': 'ALLOWED_DOMAIN',
          'Content-Type': 'application/json'
        });
      });
    }); // WHEN no error thrown

    describe('WHEN error thrown', () => {
      beforeEach(() => spyOn(lib, '_putData').and.returnValue(Promise.reject(new Error('something'))));

      afterEach(() => expect(lib._publish).not.toHaveBeenCalled());

      it('SHOULD return error', async () => {
        const result = await lib.handler(event);

        expect(result.statusCode).toEqual(500);
        expect(JSON.parse(result.body)).toEqual({
          message: 'Internal server error'
        });
        expect(result.headers).toEqual({
          'Access-Control-Allow-Origin': 'ALLOWED_DOMAIN',
          'Content-Type': 'application/json'
        });
      });
    }); // WHEN error thrown
  }); // handler
});
