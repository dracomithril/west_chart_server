jest.mock('express');
const { mocks } = require('express');
const server = require('../index');


describe('[server]', () => {
  it('check if server started', () => {
    server();
    expect(mocks.express.listen).toBeCalledTimes(1);
    expect(mocks.express.get).not.toBeCalled();
    expect(mocks.express.use).toBeCalledTimes(7);
  });
});
