const debug = require('debug')('gracefultools');

const events = [
  'SIGTERM',
  'SIGINT',
];

let isShuttingDown = false;
let processTimeout = 1000;
let httpListener;
let onClose;

const handleClose = () => {
  debug('Closed remaining connections.');
  process.exit(0);
};

const handleTimeout = () => {
  debug('Couldn\'t close connections in time, forcefully shutting down.');
  process.exit(1);
};

const getShutdownHandler = (event) => () => {
  if (isShuttingDown) return;

  debug(`Received ${event}, shutting down.`);

  isShuttingDown = true;
  httpListener.close(handleClose);
  if (typeof onClose === 'function') onClose(event);

  setTimeout(handleTimeout, processTimeout);
};

const middleware = () => (req, res, next) => {
  if (!isShuttingDown) return next();
  res.setHeader('Connection', 'close');
  res.status(502).send('Server is shutting down.');
};

const start = (app, options, handler) => {
  const { timeout, port: desiredPort } = options;

  const port = desiredPort || 3000;
  const protocol = options.secure ? 'https' : 'http';
  const host = options.host || 'localhost';
  const address = `${protocol}://${host}:${port}`;

  const message = `Server listening on ${address}`;

  if (typeof timeout === 'number') processTimeout = timeout;
  onClose = handler;

  const sendEvents = (text) => {
    console.log(text);
    if (process.connected) process.send('ready');
  };

  if (host) {
    httpListener = app.listen(port, host, () => sendEvents(`${message} (bound to host: ${host})`));
  } else {
    httpListener = app.listen(port, () => sendEvents(message));
  }

  events.forEach((event) => process.on(event, getShutdownHandler(event)));
};

module.exports = { middleware, start };
