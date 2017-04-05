/**
 * Created by Gryzli on 24.01.2017.
 */
let Promise = require("bluebird");
let request = Promise.promisifyAll(require("request"));
const api_ver = 'v2.8';
const limit = 100;
let days = 7;
// let EventEmitter = require('events').EventEmitter;
let fieldsArr = ['story', 'from', 'link', 'caption', 'icon', 'created_time', 'source', 'name', 'type', 'message',
    'attachments', 'full_picture', 'updated_time', 'likes.limit(1).summary(true)', 'reactions.limit(1).summary(true)',
    'comments.limit(50).summary(true){message,from}'];
let fields = fieldsArr.join(',');
const timeout = 9000;
// since=2017-01-15&until=2017-01-16
/**
 *
 * @param since {string}
 * @param until {string}
 * @param groupId {string}
 * @param access_token {string}
 */
function obtainList(since, until, groupId, access_token) {
    return new Promise((resolve, reject) => {
        let all_charts = [];
        let address = 'https://graph.facebook.com';

        let query = {
            fields: fields,
            limit: limit,
            access_token: access_token,
            since: since,
            until: until
        };
        let path = `/${api_ver}/${groupId}/feed`;

        let options = {
            uri: path,
            baseUrl: address,
            qs: query,
            port: 443,
            path: path,
            method: 'GET',
            timeout: timeout,
            simple: true,
            json: true,
            resolveWithFullResponse: false
        };

        function reactOnBody(res) {
            if (res.statusCode === 200) {
                let b = res.body;
                console.log(`in react on body. Grabbed ${ b.data ? b.data.length : 0} elements.`);
                all_charts.push(...b.data);
                if (b.paging && b.paging.next) {
                    console.log('get next part of response.');
                    return request.getAsync({
                        url: b.paging.next,
                        json: true,
                        method: 'GET',
                        timeout: timeout
                    }).then(reactOnBody);
                } else {
                    console.log('invoke resolve');
                    resolve(all_charts);
                }
            }
            else {
                const error = new Error();
                error.statusCode = res.statusCode;
                console.error(`error obtaining chart list. statusCode: ${res.statusCode} body: ${res.body}`);
                error.sub_error = res.body ? JSON.parse(res.body) : undefined;
                reject(error)
            }
        }

        request.getAsync(options).then(reactOnBody).catch(reject);
    })
}
function filterChartAndMap(body) {
    return new Promise((resolve) => {
        const map = body.map((elem, id) => {
            let comments = elem.comments.data.filter((elem) => {
                const search = elem.message.match(/(\[Added)\s(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d]/g);
                return (search !== null)
            });
            let addedTime = undefined;
            let addedBy = undefined;
            if (comments.length > 0) {
                const message = comments[0].message;
                const match = message.match(/(0[1-9]|[12][0-9]|3[01])[- /.](0[1-9]|1[012])[- /.](19|20)\d\d/g)[0];
                const date = match.split(/[- /.]/g);
                //todo test for added
                const year = Number(date[2]);
                const month = Number(date[1]) - 1;
                const day = Number(date[0]);
                addedTime = new Date(year, month, day);
                addedBy = comments[0].from.name;
            }
            let attachment = elem.attachments.data.length > 0 ? elem.attachments.data[0] : {};

            const link = {
                url: elem.link,
                name: elem.name,
                title: attachment.type === 'music_aggregation' ? attachment.description : attachment.title,
                type: attachment.type
            };
            return {
                added_time: addedTime,
                added_by: addedBy,
                created_time: elem.created_time,
                from_user: elem.from.name,
                full_picture: elem.full_picture,
                id: id,
                likes_num: elem.likes.summary.total_count,
                link: link,
                message: elem.message,
                reactions_num: elem.reactions.summary.total_count,
                selected: false,
                source: elem.source,
                type: elem.type,
                updated_time: elem.updated_time
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
        if (show_days !== undefined) {
            days = show_days;
        }
        let a_since, a_until;
        if (!until || !since) {
            let date = new Date();
            let since_date = new Date();
            since_date.setDate(date.getDate() - days);
            a_until = date.toISOString();
            a_since = since_date.toISOString();

        } else {
            a_since = since;
            a_until = until
        }
        obtainList(a_since, a_until, groupId, access_token).then(filterChartAndMap).then((body) => {
            let until = new Date().toISOString();
            let cache = {
                chart: body,
                last_update: until
            };
            resolve(cache);
        }).catch(reject);
    });
}
module.exports = UpdateChart;