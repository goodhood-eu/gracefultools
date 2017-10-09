Graceful tools
================

Gracefully shuts down ExpressJS server. Sends PM2 events to signal when instance is ready to accept connections. Sends 502 responses during shutdown for a load balancer to handle.

## Usage:

```
const app = require('express')();
const { middleware: gracefulMiddleware, start: gracefulStart } = require('gracefultools');

const host = process.env.HOST; // to bind server to a specific host, defaults to `undefined`
const port = parseInt(process.env.PORT, 10) || 3000; // port to listen to, defaults to `3000`
const timeout = 300; // ms, defaults to `1000`

// As early as you can - this will end requests during shutdown.
app.use(gracefulMiddleware());

...

// When you're ready to start your app
// onShutdown - invoked when shutdown started
gracefulStart(app, { host, port, timeout }, onShutdown);
```
