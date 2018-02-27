const sinon = require('sinon');

const express = jest.genMockFromModule('express');

const router = {
  use: sinon.stub(),
  get: sinon.stub(),
  put: sinon.stub(),
  post: sinon.stub(),
};
const expressMock = {
  use: sinon.stub(),
  get: sinon.stub(),
  put: sinon.stub(),
  set: sinon.stub(),
  engine: sinon.stub(),
  listen: sinon.stub(),
};
express.mockImplementation(() => expressMock);
express.Router.mockImplementation(() => router);

express.mocks = {
  express: expressMock,
  router,
};
module.exports = express;
