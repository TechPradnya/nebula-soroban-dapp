const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const authValidation = require('../validations/authValidation');

const router = express.Router();

router.post('/register', authLimiter, validate(authValidation.register), authController.register);
router.post('/login', authLimiter, validate(authValidation.login), authController.login);
router.get('/me', requireAuth, authController.me);
router.patch('/wallet', requireAuth, validate(authValidation.linkWallet), authController.linkWallet);

module.exports = router;
