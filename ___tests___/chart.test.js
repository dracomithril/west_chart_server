/**
 * Created by Gryzli on 24.01.2017.
 */
/* eslint-env node, es6 */
// let sinon = require('sinon');
let test_body = require('./data/fbResult.json');
let test_body2 = require('./data/fbResult2.json');

describe('[chart]', function () {
    let Chart, clock;
    beforeAll(() => {
        jest.mock('request-promise-native');
        Chart = require('../chart');
    });
    afterAll(() => {
        clock.restore();
        jest.unmock('request-promise-native');
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
    it('should be able to obtain list from chart', function (done) {

        let groupId = '1707149242852457';

        const body1 = {
            statusCode: 200,
            body: test_body
        };
        let options = {
            "uri": "/v2.9/1707149242852457/feed",
            "baseUrl": "https://graph.facebook.com",
            "qs": {
                "fields": "story,from,link,caption,icon,created_time,source,name,type,message,attachments,full_picture,updated_time,likes.limit(1).summary(true),reactions.limit(1).summary(true),comments.limit(50).summary(true){message,from}",
                "limit": 100,
                "access_token": ""
            },
            "port": 443,
            "path": "/v2.9/1707149242852457/feed",
            "method": "GET",
            "timeout": 9000,
            "simple": true,
            "json": true,
            "resolveWithFullResponse": false
        };
        const body2 = {
            statusCode: 200,
            body: test_body2
        };
        let request = require('request-promise-native');
        request.mockReturnValueOnce(Promise.resolve(body1))
            .mockReturnValueOnce(Promise.resolve(body2));

        const date = new Date('2017-03-03T23:00:00');
        let since_date = new Date(date.toISOString());
        since_date.setDate(date.getDate() - 31);

        Chart(31, since_date.toISOString(), date.toISOString(), '', groupId).then((res) => {
            expect(request.mock.calls.length).toBe(1);
            expect(res.chart.length).toEqual(97);
            done();
        }).catch(err => {
            console.log('error');
            return Promise.reject(err);
        });
        // jest.runAllTimers();
    });
});



