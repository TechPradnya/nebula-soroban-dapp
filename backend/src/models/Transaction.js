const mongoose = require('mongoose');
const { MARKETPLACE_EVENT_TYPES, STAKING_EVENT_TYPES } = require('../constants');

const transactionSchema = new mongoose.Schema(
  {
    txHash: { type: String, required: true, unique: true, index: true },
    ledger: { type: Number, required: true },
    contract: { type: String, enum: ['marketplace', 'staking'], required: true },
    eventType: {
      type: String,
      enum: [...MARKETPLACE_EVENT_TYPES, ...STAKING_EVENT_TYPES],
      required: true,
      index: true,
    },
    actorAddress: { type: String, required: true, index: true },
    relatedTaskId: { type: Number, default: null, index: true },
    amount: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true },
  },
  { timestamps: true },
);

transactionSchema.index({ actorAddress: 1, occurredAt: -1 });
transactionSchema.index({ contract: 1, eventType: 1, occurredAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
