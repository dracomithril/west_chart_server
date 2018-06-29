const express = require('express');
const winston = require('winston');
const { version } = require('../../package');
const config = require('../config');

const router = express.Router();
// todo move it to environment variables
let count = 0;

router.get('/info', (req, res) => {
  const serverInfo = {
    version,
    node_env: process.env.NODE_ENV,
    port: config.port,
  };
  winston.debug(serverInfo);
  winston.warn(`text from heroku: ${process.env.TEST_ENV}`);
  res.send(
    `hello world! my version is: ${serverInfo.version} you are ${++count} person. text: ${
      process.env.TEST_ENV
    } ${JSON.stringify(serverInfo)}`,
  );
  res.end();
});

module.exports = router;
