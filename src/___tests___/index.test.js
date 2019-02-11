/* eslint-env node, es6 */
/**
 * Created by michal.grezel on 18.06.2017.
 */
jest.mock('express');
const sinon = require('sinon');
const server = require('../index');

describe('[server]', function () {
  it("check if server started", function () {
    const express = require('express');
    server();
    sinon.assert.calledOnce(express.mocks.express.listen);
    sinon.assert.callCount(express.mocks.express.get, 0);
    sinon.assert.callCount(express.mocks.express.use, 7);
  });
});
