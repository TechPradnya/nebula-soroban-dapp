const mongoose = require('mongoose');
const { TASK_STATUSES, TASK_CATEGORIES, MAX_PLATFORM_FEE_BPS, STELLAR_ADDRESS_PATTERN } = require('../constants');

/**
 * Mirrors the on-chain `Task` struct from the Marketplace Soroban contract.
 * The contract remains the source of truth for funds and status
 * transitions; this collection exists purely so the frontend can search,
 * filter, and paginate without round-tripping to the ledger for every list
 * view. The indexer service is the only writer that should ever flip
 * `status` — everything else here (category, tags, title) is off-chain
 * metadata that enriches the on-chain record.
 */
const taskSchema = new mongoose.Schema(
  {
    onChainId: { type: Number, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, required: true, maxlength: 5000 },
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      default: 'other',
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    clientAddress: { type: String, required: true, index: true, match: STELLAR_ADDRESS_PATTERN },
    freelancerAddress: { type: String, default: null, index: true, match: [STELLAR_ADDRESS_PATTERN, 'Invalid Stellar address'] },
    amount: { type: String, required: true }, // stringified i128 (stroops)
    feeBps: { type: Number, required: true, min: 0, max: MAX_PLATFORM_FEE_BPS },
    deliverableUrl: { type: String, default: null },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'open',
      index: true,
    },
    txHashes: {
      created: { type: String, default: null },
      accepted: { type: String, default: null },
      submitted: { type: String, default: null },
      completed: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

taskSchema.index({ title: 'text', description: 'text', tags: 'text' });
taskSchema.index({ status: 1, createdAt: -1 });
// Supports "my tasks" queries (client OR freelancer) without a collection scan.
taskSchema.index({ clientAddress: 1, freelancerAddress: 1 });

/** Convenience virtual so API consumers don't all have to redo stroop math. */
taskSchema.virtual('amountXlm').get(function amountXlm() {
  return Number(this.amount) / 10_000_000;
});

module.exports = mongoose.model('Task', taskSchema);
