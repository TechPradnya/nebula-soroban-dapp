const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

/**
 * 404 handler for routes that don't match anything registered — must be
 * mounted after all route definitions.
 */
function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} does not exist`));
}

/**
 * Centralized error handler. Every thrown error — ApiError, Mongoose
 * validation error, JWT error, or unexpected bug — funnels through here so
 * the API always returns a consistent JSON error shape and never leaks
 * stack traces in production.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let { statusCode, message } = err;
  let details = err.details || null;

  if (err.name === 'ValidationError' && err.errors) {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => e.message);
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Duplicate value for field: ${field}`;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
  }

  if (!statusCode) statusCode = 500;
  if (!message) message = 'Internal server error';

  const isOperational = err instanceof ApiError || statusCode < 500;
  if (!isOperational) {
    logger.error(`Unhandled error: ${err.stack || err.message}`);
  } else if (statusCode >= 500) {
    logger.error(err.message);
  } else {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    requestId: req.id,
    ...(env.nodeEnv === 'development' && !isOperational ? { stack: err.stack } : {}),
  });
}

module.exports = { notFoundHandler, errorHandler };
