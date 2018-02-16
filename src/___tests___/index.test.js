/**
 * Created by Gryzli on 18.06.2017.
 */
/* eslint-env node, es6 */
const sinon = require('sinon');
describe('[server]', function () {
  const router = {
    use: sinon.stub(),
    get: sinon.stub(),
    put: sinon.stub(),
    post: sinon.stub(),
  };
  let expressMock = {
    use: sinon.stub(),
    get: sinon.stub(),
    put: sinon.stub(),
    set: sinon.stub(),
    engine: sinon.stub(),
    listen: sinon.stub(),
  };
  it("check if server started", function () {
    jest.mock('express');
    let express = require('express');
    express.mockImplementation(() => expressMock);
    express.Router.mockImplementation(() => router);
    require('../index');

    sinon.assert.calledOnce(expressMock.listen);
    sinon.assert.callCount(expressMock.get, 0);
    sinon.assert.callCount(expressMock.use, 9);
  });
});
