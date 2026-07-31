/**
 * Central definition of every enum used across models, Joi schemas, and the
 * indexer's event-to-status mapping. Previously these lists were typed out
 * independently in four different files; a new category or status meant
 * remembering to update all of them in lockstep, and nothing enforced that.
 */

const TASK_STATUSES = [
  'open',
  'in_progress',
  'submitted',
  'completed',
  'cancelled',
  'disputed',
  'resolved',
];

const TASK_CATEGORIES = ['development', 'design', 'writing', 'marketing', 'data', 'other'];

const USER_ROLES = ['client', 'freelancer', 'admin'];

const MARKETPLACE_EVENT_TYPES = [
  'task_created',
  'task_accepted',
  'work_submitted',
  'task_completed',
  'task_cancelled',
  'task_disputed',
  'dispute_resolved',
];

const STAKING_EVENT_TYPES = ['stake', 'unstake', 'claim', 'fee_deposited'];

const MAX_PLATFORM_FEE_BPS = 2000; // 20% — mirrors the hard cap enforced on-chain in the Marketplace contract

const STELLAR_ADDRESS_PATTERN = /^G[A-Z2-7]{55}$/;

module.exports = {
  TASK_STATUSES,
  TASK_CATEGORIES,
  USER_ROLES,
  MARKETPLACE_EVENT_TYPES,
  STAKING_EVENT_TYPES,
  MAX_PLATFORM_FEE_BPS,
  STELLAR_ADDRESS_PATTERN,
};
