const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const SIGNAL = 'SIGTERM';
const TIMEOUT = 1000;
const serverOptions = {
  port: 3000,
};


describe('index', () => {
  let server;
  let exitStub;

  let instance;
  let req;
  let res;
  let next;

  after(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  beforeEach(() => {
    server = {
      listen: sinon.stub().returnsThis(),
      close: sinon.stub().returnsThis(),
    };
    exitStub = sinon.stub(process, 'exit');
    process.send = sinon.spy();

    instance = proxyquire('../index', {});
    req = {};
    res = {
      setHeader: sinon.stub().returnsThis(),
      status: sinon.stub().returnsThis(),
      send: sinon.stub().returnsThis(),
    };
    next = sinon.spy();
  });

  afterEach(() => {
    sinon.restore();
    delete process.send;
  });

  it('middleware - passthrough', () => {
    instance.middleware()(req, res, next);

    expect(res.send.notCalled).to.be.true;
    expect(next.calledOnce).to.be.true;
  });

  it('middleware - drop', (done) => {
    instance.start(server, serverOptions);

    process.kill(process.pid, SIGNAL);
    process.once(SIGNAL, () => {
      process.nextTick(() => {
        instance.middleware()(req, res, next);
        expect(res.status.calledWith(502)).to.be.true;
        expect(res.send.calledOnce).to.be.true;
        expect(res.setHeader.withArgs('Connection', 'close').calledOnce).to.be.true;
        expect(next.notCalled).to.be.true;
        done();
      });
    });
  });

  it('should start listening', () => {
    instance.start(server, serverOptions);
    expect(server.listen.withArgs(serverOptions.port).calledOnce).to.be.true;
  });

  it('should start listening with host', () => {
    const host = 'hallo.de';
    instance.start(server, { ...serverOptions, host });
    expect(server.listen.withArgs(serverOptions.port, host).calledOnce).to.be.true;
  });

  it('should call shutdown handler', (done) => {
    const spy = sinon.spy();
    process.once(SIGNAL, () => {
      process.nextTick(() => {
        expect(spy.withArgs(SIGNAL).calledOnce).to.be.true;
        done();
      });
    });
    instance.start(server, serverOptions, spy);
    process.kill(process.pid, SIGNAL);
  });

  it(`should call 'server.close()' when receiving a ${SIGNAL}`, (done) => {
    process.once(SIGNAL, () => {
      process.nextTick(() => {
        expect(server.close.calledOnce).to.be.true;
        done();
      });
    });
    instance.start(server, serverOptions);
    process.kill(process.pid, SIGNAL);
  });

  it(`should call 'process.exit()' after ${TIMEOUT}ms when receiving a ${SIGNAL}`, (done) => {
    const clock = sinon.useFakeTimers();

    process.once(SIGNAL, () => {
      process.nextTick(() => {
        // It shouldn't have called `process.exit()` right after the signal was sent.
        expect(exitStub.notCalled).to.be.true;

        // Advance the clock to a bit after the timeout.
        clock.tick(TIMEOUT + 10);

        // At this point, the timeout handler should have triggered, and
        // `process.exit()` should have been called.
        expect(exitStub.calledOnce).to.be.true;
        clock.restore();
        done();
      });
    });
    instance.start(server, serverOptions);
    process.kill(process.pid, SIGNAL);
  });
});
