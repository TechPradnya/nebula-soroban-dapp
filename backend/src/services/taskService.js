const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');

/**
 * Note: creating/accepting/submitting/approving tasks happens on-chain,
 * signed by the user's own wallet â€” this service never mutates contract
 * state. It only maintains the off-chain metadata mirror (search,
 * filters, pagination) that the indexer keeps in sync with confirmed
 * contract events.
 */

async function listTasks({ status, category, search, page = 1, limit = 20 }) {
  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Task.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Task.countDocuments(query),
  ]);

  return {
    items,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  };
}

async function getTaskByOnChainId(onChainId) {
  const task = await Task.findOne({ onChainId });
  if (!task) throw ApiError.notFound(`Task #${onChainId} not found`);
  return task;
}

/**
 * Persists the off-chain metadata for a task immediately after its
 * `create_task` transaction has confirmed on-chain â€” `onChainId` here is
 * the real id decoded from the contract's return value, not a placeholder.
 * If the indexer's `task_created` event handler races this write, both
 * paths converge on the same document via the unique `onChainId` index.
 */
async function createTaskRecord({
  onChainId,
  title,
  description,
  category,
  tags,
  clientAddress,
  amount,
  feeBps,
  txHash,
}) {
  const existing = await Task.findOne({ onChainId });
  if (existing && existing.description !== 'Metadata pending sync.') {
    throw ApiError.conflict(`Task #${onChainId} already has metadata recorded`);
  }

  return Task.findOneAndUpdate(
    { onChainId },
    {
      $set: {
        title,
        description,
        category,
        tags,
        clientAddress,
        amount,
        feeBps,
        status: 'open',
        'txHashes.created': txHash || null,
      },
    },
    { upsert: true, new: true },
  );
}

async function getTasksByAddress(address) {
  return Task.find({ $or: [{ clientAddress: address }, { freelancerAddress: address }] }).sort({
    createdAt: -1,
  });
}

module.exports = { listTasks, getTaskByOnChainId, createTaskRecord, getTasksByAddress };

