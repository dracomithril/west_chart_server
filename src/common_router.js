const express = require('express');
const { version } = require('./../package');
const { MongoClient } = require('mongodb');
const winston = require('winston');
const config = require('./config');

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
router.put('/log_errors', (req, res) => {
  winston.warn('Error was logged but seving logs is still not implemented so we implement that in logs');
  winston.error(req.body);
  res.status(200).send();
});
router.put('/user/login/:id', ({ params, body }, res) => {
  // Connection URL
  // Use connect method to connect to the Server
  let database;
  body._id = process.env.NODE_ENV === 'production' ? params.id : `${process.env.NODE_ENV.substr(0, 4)}_${params.id}`;

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
module.exports = router;
