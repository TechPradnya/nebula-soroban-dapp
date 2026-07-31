const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const User = require('../models/User');

/**
 * Verifies the bearer token and attaches the resolved user document to
 * `req.user`. Rejects tokens for users that no longer exist rather than
 * trusting stale JWT payloads.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const payload = jwt.verify(token, env.jwtSecret);
  const user = await User.findById(payload.sub).select('-passwordHash');
  if (!user) {
    throw ApiError.unauthorized('User for this token no longer exists');
  }

  req.user = user;
  next();
}

/**
 * Optional auth: attaches req.user if a valid token is present, but never
 * throws. Useful for endpoints that personalize responses for logged-in
 * users while remaining publicly readable.
 */
async function attachUserIfPresent(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select('-passwordHash');
    if (user) req.user = user;
  } catch (err) {
    // Invalid/expired token on an optional route — proceed unauthenticated.
  }
  next();
}

/** Restricts a route to specific roles, e.g. requireRole('admin'). */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
}

module.exports = { requireAuth, attachUserIfPresent, requireRole };
