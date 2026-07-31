const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function issueToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

async function register({ displayName, email, password, role }) {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ displayName, email, passwordHash, role });

  return { user, token: issueToken(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  return { user, token: issueToken(user) };
}

async function linkWallet(userId, walletAddress) {
  const conflict = await User.findOne({ walletAddress, _id: { $ne: userId } });
  if (conflict) {
    throw ApiError.conflict('This wallet is already linked to another account');
  }

  const user = await User.findByIdAndUpdate(userId, { walletAddress }, { new: true });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

module.exports = { register, login, linkWallet, issueToken };
