/*
 * Created by Gryzli on 24.01.2017.
 */
const winston = require('winston');
const request = require('request-promise-native');
const path = require('path');

const apiVer = process.env.FB_API_VERSION || '';
const limit = 100;
// let EventEmitter = require('events').EventEmitter;
const fieldsArr = [
  'story',
  'from{first_name,last_name,name,id}',
  'link',
  'caption',
  'icon',
  'created_time',
  'source',
  'name',
  'type',
  'message',
  'attachments',
  'full_picture',
  'updated_time',
  'likes.limit(1).summary(true)',
  'reactions.limit(1).summary(true)',
  'comments.limit(50).summary(true){message,from}',
];
const fields = fieldsArr.join(',');
const timeout = 9000;

const getFbPictureUrl = id => `https://graph.facebook.com/${id}/picture?height=50`;

function GetError(res) {
  const error = new Error();
  error.statusCode = res.statusCode;
  error.sub_error = res.body ? JSON.parse(res.body) : undefined;
  return error;
}

// since=2017-01-15&until=2017-01-16
/**
 *
 * @param since {string}
 * @param until {string}
 * @param groupId {string}
 * @param accessToken {string}
 */
function obtainList(since, until, groupId, accessToken) {
  return new Promise((resolve, reject) => {
    const address = 'https://graph.facebook.com';

    const query = {
      fields,
      limit,
      access_token: accessToken,
      since,
      until,
    };
    const pathname = path.resolve('/', apiVer, groupId, 'feed');

    const options = {
      uri: pathname,
      baseUrl: address,
      qs: query,
      port: 443,
      method: 'GET',
      timeout,
      simple: true,
      json: true,
      resolveWithFullResponse: true,
    };

    function reactOnBody(res, allCharts = []) {
      if (res.statusCode !== 200) {
        const error = GetError(res);

        return Promise.reject(error);
      }
      const { body } = res;
      winston.debug(`in react on body. Grabbed ${body.data ? body.data.length : 0} elements.`);
      allCharts.push(...body.data);
      if (body.data.length === limit && body.paging && body.paging.next) {
        winston.debug('get next part of response.');
        return request
          .get({
            url: body.paging.next,
            json: true,
            method: 'GET',
            timeout,
            resolveWithFullResponse: true,
          })
          .then(response => reactOnBody(response, allCharts));
      }
      return Promise.resolve(allCharts);
    }

    // todo modify to use reject errors resolveWithFullResponse: false
    request(options)
      .then(reactOnBody)
      .then(resolve)
      .catch(err => {
        winston.error(`error obtaining chart list. statusCode: ${err.statusCode} body: ${err.sub_error}`);
        reject(err);
      });
  });
}

function filterChartAndMap(body) {
  return new Promise(resolve => {
    const map = body.map(elem => {
      const attachment = ((elem.attachments || {}).data || []).length > 0 ? elem.attachments.data[0] : {};

      const link = {
        url: elem.link,
        name: elem.name,
        title: attachment.type === 'music_aggregation' ? attachment.description : attachment.title,
        type: attachment.type,
      };
      const from = { ...elem.from, picture_url: getFbPictureUrl(elem.from.id) };
      return {
        createdTime: elem.createdTime,
        from,
        full_picture: elem.full_picture,
        id: elem.id,
        likes_num: elem.likes.summary.total_count,
        link,
        message: elem.message,
        reactionsNum: elem.reactions.summary.total_count,
        selected: false,
        source: elem.source,
        type: elem.type,
        updated_time: elem.updated_time,
      };
    });
    resolve(map);
  });
}

/**
 *
 * @param show_days {number}
 * @param since {string}
 * @param until {string}
 * @param access_token {string}
 * @param groupId {string}
 */
function UpdateChart(show_days, since, until, access_token, groupId) {
  return new Promise((resolve, reject) => {
    obtainList(since, until, groupId, access_token)
      .then(filterChartAndMap)
      .then(body => {
        const cache = {
          chart: body,
          lastUpdateDate: new Date().toISOString(),
        };
        resolve(cache);
      })
      .catch(reject);
  });
}

module.exports = UpdateChart;
