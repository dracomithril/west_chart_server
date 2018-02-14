/*
 * Created by Gryzli on 24.01.2017.
 */
const winston = require('winston');
const request = require('request-promise-native');

const apiVer = process.env.FB_API_VERSION || 'v2.12';
const limit = 100;
let days = 7;
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
    const path = `/${apiVer}/${groupId}/feed`;

    const options = {
      uri: path,
      baseUrl: address,
      qs: query,
      port: 443,
      path,
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
        winston.error(
          `error obtaining chart list. statusCode: ${err.statusCode} body: ${err.sub_error}`,
        );
        reject(err);
      });
  });
}

function filterChartAndMap(body) {
  return new Promise(resolve => {
    const map = body.map(elem => {
      const comments = elem.comments.data.filter(({ message }) => {
        const search = message.match(
          /(\[Added)\s(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d]/g,
        );
        return search !== null;
      });
      let addedTime;
      let addedBy;
      if (comments.length > 0) {
        const { message } = comments[0];
        const match = message.match(
          /(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d/g,
        )[0];
        const date = match.split(/[- /.]/g);
        // todo test for added
        const year = Number(date[2]);
        const month = Number(date[1]) - 1;
        const day = Number(date[0]);
        addedTime = new Date(year, month, day);
        addedBy = comments[0].from.name;
      }
      const attachment =
        ((elem.attachments || {}).data || []).length > 0 ? elem.attachments.data[0] : {};

      const link = {
        url: elem.link,
        name: elem.name,
        title: attachment.type === 'music_aggregation' ? attachment.description : attachment.title,
        type: attachment.type,
      };
      return {
        added_time: addedTime,
        added_by: addedBy,
        created_time: elem.created_time,
        from: elem.from,
        from_user: elem.from.name,
        full_picture: elem.full_picture,
        id: elem.id,
        likes_num: elem.likes.summary.total_count,
        link,
        message: elem.message,
        reactions_num: elem.reactions.summary.total_count,
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
    days = show_days;
    let a_since;
    let a_until;
    if (!until || !since) {
      const date = new Date();
      const since_date = new Date();
      since_date.setDate(date.getDate() - days);
      a_until = Math.round(date.getTime() / 1000.0);
      a_since = Math.round(since_date.getTime() / 1000.0);
    } else {
      a_since = since;
      a_until = until;
    }
    obtainList(a_since, a_until, groupId, access_token)
      .then(filterChartAndMap)
      .then(body => {
        const cache = {
          chart: body,
          last_update: new Date().toISOString(),
        };
        resolve(cache);
      })
      .catch(reject);
  });
}

module.exports = UpdateChart;
