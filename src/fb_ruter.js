/**
 * Created by dracomithril on 24.01.2017.
 */
const express = require('express');

const router = express.Router();
const winston = require('winston');
const chart = require('./chart');

const groupId = '1707149242852457';

/**
 * @return {*}
 */
module.exports = function returnFbRouter() {
  router.use('/policy', (req, res) => {
    res.render('privacy_policy');
  });
  router.get('/get_chart', ({ query }, res) => {
    winston.log('in get chart.');
    winston.profile('obtain-chart');
    const days = query.days ? Number(query.days) : 31;
    chart(days, query.since, query.until, query.access_token, groupId)
      .then(body => {
        winston.info(`returning chart list with: ${body.chart.length}`);
        winston.profile('obtain-chart');
        res.status(200).send(body);
      })
      .catch(err => {
        winston.error('error on /api/get_chart');
        winston.error(err);
        const statusCode = err.statusCode || 400;
        const error = err.sub_error || "Sorry we don't know what happened :( ";
        res.status(statusCode).send(error);
      });
  });
  return router;
};
