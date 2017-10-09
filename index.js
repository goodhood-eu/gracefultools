const { info, warn } = require('winston');

const events = [
  'SIGTERM',
  'SIGINT',
];

let isShuttingDown = false;
let processTimeout = 1000;
let httpListener;
let onClose;

const handleClose = () => {
  info('Closed remaining connections.');
  process.exit(0);
};

const handleTimeout = () => {
  warn('Couldn\'t close connections in time, forcefully shutting down.');
  process.exit(1);
};

const getShutdownHandler = (event) => () => {
  if (isShuttingDown) return;

  info(`Received ${event}, shutting down.`);

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
  const { host, port: desiredPort, timeout } = options;
  const port = desiredPort || 3000;
  const message = `Server listening on http://${host || 'localhost'}:${port}`;

  if (typeof timeout === 'number') processTimeout = timeout;
  onClose = handler;

  const sendEvents = (text) => {
    info(text);
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
