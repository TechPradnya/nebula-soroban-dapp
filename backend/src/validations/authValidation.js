const Joi = require('joi');
const { STELLAR_ADDRESS_PATTERN } = require('../constants');

const register = Joi.object({
  displayName: Joi.string().trim().min(2).max(60).required(),
  email: Joi.string().email().max(254).lowercase().trim().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-zA-Z]/, 'letter')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.pattern.name': 'password must contain at least one letter and one number',
    }),
  role: Joi.string().valid('client', 'freelancer').default('freelancer'),
});

const login = Joi.object({
  email: Joi.string().email().max(254).lowercase().trim().required(),
  password: Joi.string().max(128).required(),
});

const linkWallet = Joi.object({
  walletAddress: Joi.string()
    .pattern(STELLAR_ADDRESS_PATTERN)
    .required()
    .messages({ 'string.pattern.base': 'walletAddress must be a valid Stellar public key' }),
});

module.exports = { register, login, linkWallet };
