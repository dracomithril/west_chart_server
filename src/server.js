/**
 * Created by Gryzli on 24.01.2017.
 */
const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const cors = require('cors');
const express = require('express');
const expressWinston = require('express-winston');
const { version } = require('./../package');
const winston = require('winston');
const path = require('path');
const serveStatic = require('serve-static');
const spotify = require('./spotify_router');
const fb_router = require('./facebook_router');
const config = require('./config');
const https = require('https');
const common = require('./common_router');

const blackList = ['/api/info'];

winston.info('NODE_ENV:', process.env.NODE_ENV);
winston.info(version);
winston.warn(`text from heroku: ${process.env.TEST_ENV}`);
const { client } = config;
// TODO add JWT validation
module.exports = () => {
  const app = express();

  app.use(cors({ origin: `https://${client}.herokuapi.com` }));
  app.use(serveStatic(path.join(__dirname, '..', 'public')));
  app.set('views', path.join(__dirname, '..', 'public'));
  app.engine('html', ejs.renderFile);
  app.set('view engine', 'html');
  app.use(compression());
  app.use(bodyParser.json());
  app.use(cookieParser());

  const ignoreRoute = (req /* , res */) =>
    blackList.indexOf(req.originalUrl || req.url) !== -1 || req.originalUrl.includes('/static/');

  app.use(
    expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: true,
          colorize: true,
        }),
      ],
      meta: false, // optional: control whether you want to log the meta data about the request (default to true)
      msg: 'HTTP {{req.method}} {{res.statusCode}} {{req.url}}', // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      requestWhitelist: ['url', 'headers', 'method', 'httpVersion'],
      bodyBlacklist: ['refresh_token', 'access_token'],
      ignoreRoute, // optional: allows to skip some log messages based on request and/or response
      skip: ignoreRoute,
    }),
  );
  if (config.isProduction) {
    if (!config.skipHttpRedirect) {
      // Serve static assets
      app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
          winston.info(`redirected from http. secure: ${req.secure.toString()}`);
          res.redirect(`https://${req.get('host')}${req.url}`);
        } else next();
      });
    }
    setInterval(() => {
      https.get(`${config.redirectUrl}/api/info`);
    }, 280000); // every 5 minutes (300000)
  }
  // todo don't log api/info
  app.use('/404', express.static(path.resolve(__dirname, 'public', 'not_found')));

  app.use('/api', common);
  app.use('/api', fb_router());
  app.use('/api/spotify', spotify());
  // keep alive
  app.use((req, res) => {
    res.status(404);
    if (req.accepts('html')) {
      res.render('not_found');
      return;
    }

    // respond with json
    if (req.accepts('json')) {
      res.send({ error: 'Not found' });
      return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
  });
  return app;
};
