require('express-async-errors');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const env = require('./config/env');
const logger = require('./utils/logger');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const requestId = require('./middleware/requestId');

function createApp() {
  const app = express();

  // Railway/Render/Vercel all sit behind a reverse proxy. Without this,
  // req.ip resolves to the proxy's address for every request, which
  // silently breaks IP-based rate limiting (everyone shares one bucket)
  // and makes access logs useless for tracing abuse.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // The API only ever returns JSON; it serves no HTML/JS itself,
          // so this can be locked down far tighter than the frontend's.
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          imgSrc: ["'none'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  const allowedOrigins = env.clientOrigin.split(',').map((origin) => origin.trim());
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Strips any request key starting with '$' or containing '.', which
  // blocks NoSQL operator injection (e.g. {"email": {"$ne": null}}) before
  // it ever reaches a Mongoose query.
  app.use(mongoSanitize({ replaceWith: '_' }));
  // Collapses duplicate query-string keys (?status=open&status=completed)
  // to the last value instead of an array, which is what every controller
  // here already assumes.
  app.use(hpp());

  if (env.nodeEnv !== 'test') {
    morgan.token('id', (req) => req.id);
    const format =
      env.nodeEnv === 'production'
        ? ':id :remote-addr :method :url :status :response-time ms'
        : ':id :method :url :status :response-time ms';
    app.use(morgan(format, { stream: { write: (msg) => logger.info(msg.trim()) } }));
  }

  app.use('/api/v1', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
