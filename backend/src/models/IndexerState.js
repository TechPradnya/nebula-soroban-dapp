const mongoose = require('mongoose');

const indexerStateSchema = new mongoose.Schema({
  contract: { type: String, enum: ['marketplace', 'staking'], required: true, unique: true },
  lastProcessedLedger: { type: Number, required: true, default: 0 },
});

module.exports = mongoose.model('IndexerState', indexerStateSchema);
