const authService = require('../services/authService');

async function register(req, res) {
  const { user, token } = await authService.register(req.body);
  res.status(201).json({ success: true, data: { user, token } });
}

async function login(req, res) {
  const { user, token } = await authService.login(req.body);
  res.json({ success: true, data: { user, token } });
}

async function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

async function linkWallet(req, res) {
  const user = await authService.linkWallet(req.user._id, req.body.walletAddress);
  res.json({ success: true, data: { user } });
}

module.exports = { register, login, me, linkWallet };
