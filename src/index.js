/**
 * Created by Gryzli on 24.01.2017.
 */
const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const ejs = require('ejs');
const express = require('express');
const expressWinston = require('express-winston');
const { MongoClient } = require('mongodb');
const path = require('path');
const serveStatic = require('serve-static');
const winston = require('winston');
const spotify = require('./spotify_router');
const fb_router = require('./fb_ruter');

const app = express();
const router = express.Router();

const blackList = ['/api/info'];

const PORT = process.env.PORT || 3001;
// todo move it to environment variables
let count = 0;

winston.info(process.env.NODE_ENV);
winston.info(process.env.npm_package_version);
winston.warn(`text from heroku: ${process.env.TEST_ENV}`);
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
if (process.env.NODE_ENV === 'production') {
  if (!process.env.SKIP_HTTPS_REDIRECT) {
    // Serve static assets
    app.use((req, res, next) => {
      if (req.headers['x-forwarded-proto'] !== 'https') {
        winston.info(`redirected from http. secure: ${req.secure.toString()}`);
        res.redirect(`https://${req.get('host')}${req.url}`);
      } else next();
    });
  }
  // setInterval(() => {
  //   https.get('https://wcs-dance-chart-admin.herokuapp.com/api/info');
  // }, 280000); // every 5 minutes (300000)
}
// todo don't log api/info
app.use('/404', express.static(path.resolve(__dirname, 'public', 'not_found')));
router.get('/info', (req, res) => {
  const newVar = {
    version: process.env.npm_package_version,
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
  };
  winston.debug(newVar);
  winston.warn(`text from heroku: ${process.env.TEST_ENV}`);
  res.send(
    `hello world! my version is: ${newVar.version} you are ${++count} person. text: ${
      process.env.TEST_ENV
    } ${JSON.stringify(newVar)}`,
  );
  res.end();
});
router.put('/log_errors', (req, res) => {
  winston.warn(
    'Error was logged but seving logs is still not implemented so we implement that in logs',
  );
  winston.error(req.body);
  res.status(200).send();
});
router.put('/user/login/:id', ({ params, body }, res) => {
  // Connection URL
  // Use connect method to connect to the Server
  let database;
  body._id =
    process.env.NODE_ENV === 'production'
      ? params.id
      : `${process.env.NODE_ENV.substr(0, 4)}_${params.id}`;

  if (process.env.MONGODB_URI) {
    try {
      MongoClient.connect(process.env.MONGODB_URI)
        .then(db => {
          database = db;
          winston.debug('Connected correctly to server');

          const collection = db.collection('users');
          return collection.find({ _id: body._id }).toArray();
        })
        .then(docs => {
          winston.info('Found the following records');
          winston.debug(docs);
          const collection = database.collection('users');
          if (docs.length > 0) {
            const newBody = Object.assign({}, docs[0], body);
            newBody.last_login = new Date();
            newBody.login_count++;
            return collection.updateOne({ _id: body._id }, { $set: newBody });
          }
          body.last_login = new Date();
          body.login_count = 0;
          return collection.insertOne(body);
        })
        .then(response => {
          res.status(201).send(response);
        })
        .catch(err => {
          winston.error(err.message);
          try {
            res.status(500).send(err);
          } catch (e) {
            winston.error(e.message);
          }
        });
    } catch (e) {
      winston.error(e);
    }
  } else {
    winston.warn('no MONGODB_URI');
  }
});

app.use('/api', router);
app.use('/api/fb', fb_router());
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
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic(path.resolve(__dirname, '..', 'build')));
}
app.listen(PORT, () => {
  winston.info(`App listening on port ${PORT}!`);
});
