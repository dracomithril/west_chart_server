const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const winston = require('winston');
const { version } = require('./../package');
const config = require('./config');
const spotify = require('./routers/spotify_router');
const common = require('./routers/common_router');

const { client } = config;
winston.info('NODE_ENV:', process.env.NODE_ENV);
winston.info(version);
winston.warn(`text from heroku: ${process.env.TEST_ENV}`);

module.exports = () => {
  const app = express();
  app.use(morgan('tiny'));
  app.use(cors({ origin: `https://${client}.herokuapp.com`, credentials: true }));
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cookieParser());

  if (config.isProduction && !config.skipHttpRedirect) {
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        winston.info(`redirected from http. secure: ${req.secure.toString()}`);
        res.redirect(`https://${req.get('host')}${req.url}`);
      } else next();
    });
  }

  app.use('/api', common);
  app.use('/api/spotify', spotify());
  return app;
};
