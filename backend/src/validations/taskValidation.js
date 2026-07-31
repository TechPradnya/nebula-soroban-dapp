const Joi = require('joi');
const { TASK_STATUSES, TASK_CATEGORIES, MAX_PLATFORM_FEE_BPS, STELLAR_ADDRESS_PATTERN } = require('../constants');

const listTasks = Joi.object({
  status: Joi.string().valid(...TASK_STATUSES),
  category: Joi.string().valid(...TASK_CATEGORIES),
  search: Joi.string().max(100).trim(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

const createTaskRecord = Joi.object({
  onChainId: Joi.number().integer().min(1).required(),
  title: Joi.string().trim().min(5).max(140).required(),
  description: Joi.string().trim().min(20).max(5000).required(),
  category: Joi.string()
    .valid(...TASK_CATEGORIES)
    .required(),
  tags: Joi.array().items(Joi.string().max(30).trim()).max(10).default([]),
  clientAddress: Joi.string().pattern(STELLAR_ADDRESS_PATTERN).required().messages({
    'string.pattern.base': 'clientAddress must be a valid Stellar public key',
  }),
  amount: Joi.string()
    .pattern(/^[0-9]+$/)
    .required()
    .messages({ 'string.pattern.base': 'amount must be a non-negative integer string (stroops)' }),
  feeBps: Joi.number().integer().min(0).max(MAX_PLATFORM_FEE_BPS).required(),
  txHash: Joi.string().max(64).allow(null, ''),
});

const buildTx = Joi.object({
  method: Joi.string()
    .valid(
      'create_task',
      'accept_task',
      'submit_work',
      'approve_task',
      'cancel_task',
      'raise_dispute',
      'resolve_dispute',
      'stake',
      'unstake',
      'claim',
    )
    .required(),
  args: Joi.array().max(10).required(),
  argTypes: Joi.array().items(Joi.string().valid('address', 'i128', 'u32', 'u64', 'string')).max(10).required(),
  sourceAddress: Joi.string().pattern(STELLAR_ADDRESS_PATTERN).required(),
  contract: Joi.string().valid('marketplace', 'staking').required(),
}).custom((value, helpers) => {
  if (value.args.length !== value.argTypes.length) {
    return helpers.message('args and argTypes must be the same length');
  }
  return value;
});

const submitTx = Joi.object({
  signedXdr: Joi.string().max(20000).required(),
});

module.exports = { listTasks, createTaskRecord, buildTx, submitTx };
