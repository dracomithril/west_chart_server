/**
 * Created by Gryzli on 24.01.2017.
 */
const express = require('express');
const favicon = require('serve-favicon');
const serveStatic = require('serve-static');
const router = express.Router();
const winston = require('winston');
const path = require('path');
const app = express();
const ejs = require('ejs');
const bodyParser = require('body-parser');
const https = require("https");
const spotify = require('./spotify_router');
const fb_router = require('./fb_ruter');
const MongoClient = require('mongodb').MongoClient;
const blackList = ['/api/info'];
let cookieParser = require('cookie-parser');
const expressWinston = require("express-winston");
const PORT = process.env.PORT || 3001;
//todo move it to environment variables
let count = 0;

app.use(serveStatic(path.join(__dirname,'..','public')));
app.use(favicon(path.join(__dirname,'..', 'public', 'favicon.ico')));
app.set('views',path.join(__dirname,'..','public'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');
winston.info(process.env.NODE_ENV);
winston.info(process.env.npm_package_version);
winston.warn('text from heroku: ' + process.env.TEST_ENV);
// use it before all route definitions
// Setup logger
app.use(bodyParser.json());
app.use(cookieParser());

let ignoreRoute = function (req/*, res*/) {
    return blackList.indexOf(req.originalUrl || req.url) !== -1 || req.originalUrl.includes('/static/');
};

app.use(expressWinston.logger({
    transports: [
        new winston.transports.Console({
            json: true,
            colorize: true
        })
    ],
    meta: false, // optional: control whether you want to log the meta data about the request (default to true)
    msg: "HTTP {{req.method}} {{res.statusCode}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
    expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
    colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
    requestWhitelist: ['url', 'headers', 'method', 'httpVersion'],
    bodyBlacklist: ["refresh_token", "access_token"],
    ignoreRoute: ignoreRoute, // optional: allows to skip some log messages based on request and/or response
    skip: ignoreRoute
}));

app.use(function (req, res, next) {
    if (process.env.NODE_ENV === 'production') {
        if (req.headers['x-forwarded-proto'] !== 'https') {
           return res.redirect(301, 'https://' + req.hostname + req.originalUrl);
        }
    }
    return next();
});
if (process.env.NODE_ENV === 'production') {
// Serve static assets
    app.use(express.static(path.resolve(__dirname, '..', 'build')));
    setInterval(function () {
        https.get("https://wcs-dance-chart-admin.herokuapp.com/api/info");
    }, 280000); // every 5 minutes (300000)
}

//todo don't log api/info
app.use('/404', express.static(path.resolve(__dirname, 'public', 'not_found')));
router.get('/info', (req, res) => {

    let newVar = {
        version: process.env.npm_package_version,
        node_env: process.env.NODE_ENV,
        port: process.env.PORT
    };
    winston.debug(newVar);
    winston.warn('text from heroku: ' + process.env.TEST_ENV);
    res.send(`hello world! my version is: ${newVar.version} you are ${++count} person. text: ${process.env.TEST_ENV} ${JSON.stringify(newVar)}`);
    res.end();
});
router.put('/log_errors', (req, res) => {
    winston.warn('Error was logged but seving logs is still not implemented so we implement that in logs');
    winston.error(req.body);
});
router.put('/user/login/:id', (req, res) => {

// Connection URL
// Use connect method to connect to the Server
    let database;
    let body = req.body;
    if (process.env.NODE_ENV === 'production') {
        body._id = req.params.id;
    } else {
        body._id = process.env.NODE_ENV.substr(0, 4) + '_' + req.params.id;
    }

    if (process.env.MONGODB_URI) {
        try {
            MongoClient.connect(process.env.MONGODB_URI).then(db => {
                database = db;
                winston.debug("Connected correctly to server");


                const collection = db.collection('users');
                return collection.find({"_id": body._id}).toArray()
            }).then(docs => {
                winston.info("Found the following records");
                winston.debug(docs);
                const collection = database.collection('users');
                if (docs.length > 0) {
                    let newBody = Object.assign({}, docs[0], body);
                    newBody.last_login = new Date();
                    newBody.login_count++;
                    return collection.updateOne({"_id": body._id},
                        {$set: newBody})
                } else {
                    body.last_login = new Date();
                    body.login_count = 0;
                    return collection.insertOne(body)
                }
            }).then(response => {
                res.status(201).send(response);
            }).catch(err => {
                winston.error(err);
                try {
                    res.status(500).send(err);
                } catch (e) {
                    winston.error(e)
                }
            });
        }
        catch (e) {
            winston.error(e)
        }
    } else {
        winston.warn("no MONGODB_URI")
    }
});

app.use('/api', router);
app.use('/api/fb', fb_router());
app.use('/api/spotify', spotify());
//keep alive
app.use(function errorHandler(req, res, next) {
    res.status(404);
    if (req.accepts('html')) {
        res.render('not_found');
        return;
    }

    // respond with json
    if (req.accepts('json')) {
        res.send({error: 'Not found'});
        return;
    }

    // default to plain-text. send()
    res.type('txt').send('Not found');
});
app.listen(PORT, () => {
    winston.info(`App listening on port ${PORT}!`);
});