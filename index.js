/**
 * Created by Gryzli on 24.01.2017.
 */
const express = require('express');
const winston = require('winston');
const path = require('path');
const app = express();
const bodyParser = require('body-parser');
const http = require("http");
const spotify = require('./spotify');
const MongoClient = require('mongodb').MongoClient
    , assert = require('assert');
const chart = require('./chart');
const session = require('express-session');
const blackList = ['/api/info'];
let cookieParser = require('cookie-parser');
const expressWinston = require("express-winston");
const PORT = process.env.PORT || 3001;
//todo move it to environment variables
const groupId = '1707149242852457';
let count = 0;

winston.info(process.env.NODE_ENV);
winston.info(process.env.npm_package_version);
winston.warn('text from heroku: ' + process.env.TEST_ENV);
// use it before all route definitions
// Setup logger
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: {secure: true}
}));
app.use(bodyParser.json());
app.use(cookieParser());
let ignoreRoute = function (req, res) {
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
    msg: "HTTP {{req.method}} {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
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
            res.redirect(301, 'https://' + req.hostname + req.originalUrl);
        }
        else {
            next();
        }
    }
    else {
        next();
    }
});
// Serve static assets
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, '..', 'build')))
}
spotify(app);
app.use('/api/fb_policy', express.static(path.resolve(__dirname, '..', 'privacy_policy')));
app.get('/api/info', (req, res) => {
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
app.put('/api/log_errors', (req, res) => {

});
app.put('/api/user/login/:id', (req, res) => {

// Connection URL
// Use connect method to connect to the Server
    let database;
    let body = req.body;
    if (process.env.NODE_ENV === 'production') {
        body._id = req.params.id;
    } else {
        body._id = process.env.NODE_ENV.substr(0, 4) + '_' + req.params.id;
    }
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
            res.status(500).send(err);
        });
    }
    catch (e) {
        winston.error(e)
    }
});
app.get('/api/get_chart', (req, res) => {
    let query = req.query;
    winston.log('in get chart.');
    winston.profile('obtain-chart');
    chart(31, query.since, query.until, query.access_token, groupId).then((body) => {
        winston.info('returning chart list with: ' + body.chart.length);
        winston.profile('obtain-chart');
        res.status(200).send(body);
    }).catch((err) => {
        winston.error('error on /api/get_chart');
        winston.error(err);
        let statusCode = err.statusCode || 400;
        const error = err.sub_error || 'Sorry we don\'t know what happened :( ';
        res.status(statusCode).send(error)
    });
});
//keep alive
setInterval(function () {
    http.get("http://wcs-dance-chart-admin.herokuapp.com/api/info");
}, 280000); // every 5 minutes (300000)
app.listen(PORT, () => {
    winston.info(`App listening on port ${PORT}!`);
});