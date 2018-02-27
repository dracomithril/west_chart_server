/**
 * Created by Gryzli on 24.01.2017.
 */
const winston = require('winston');
const config = require('./config');
const server = require('./server');

const IS_EXECUTING = require.main === module;

function main() {
  const app = server();

  return app.listen(config.port, () => {
    winston.info(`App listening on port ${config.port}!`);
  });
}

/* istanbul ignore next */
if (IS_EXECUTING) {
  main();
} else module.exports = main;
