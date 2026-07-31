const crypto = require('crypto');

/**
 * Stamps every request with a short correlation id, exposed both on
 * `req.id` (for logger calls within this request) and as an `X-Request-Id`
 * response header (so a client-reported bug can be grep'd straight out of
 * server logs).
 */
function requestId(req, res, next) {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
