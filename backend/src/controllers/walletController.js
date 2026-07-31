const stellarService = require('../services/stellarService');
const Transaction = require('../models/Transaction');
const env = require('../config/env');

async function getStakingSummary(req, res) {
  const { address } = req.params;

  const { staked, earned, totalStaked } = await stellarService.readContractStateBatch({
    staked: { contractId: env.stellar.stakingContractId, method: 'staked_balance_of', args: [address], argTypes: ['address'] },
    earned: { contractId: env.stellar.stakingContractId, method: 'earned', args: [address], argTypes: ['address'] },
    totalStaked: { contractId: env.stellar.stakingContractId, method: 'total_staked', args: [], argTypes: [] },
  });

  res.json({
    success: true,
    data: {
      staked: staked.toString(),
      earned: earned.toString(),
      totalStaked: totalStaked.toString(),
    },
  });
}

async function getTransactionHistory(req, res) {
  const { address } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Transaction.find({ actorAddress: address }).sort({ occurredAt: -1 }).skip(skip).limit(limit),
    Transaction.countDocuments({ actorAddress: address }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

module.exports = { getStakingSummary, getTransactionHistory };
