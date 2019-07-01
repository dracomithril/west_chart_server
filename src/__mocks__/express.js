const express = jest.genMockFromModule('express');

const router = {
  use: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  post: jest.fn(),
};
const expressMock = {
  use: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  set: jest.fn(),
  engine: jest.fn(),
  listen: jest.fn(),
};
express.mockImplementation(() => expressMock);
express.Router.mockImplementation(() => router);

express.mocks = {
  express: expressMock,
  router,
};
module.exports = express;
