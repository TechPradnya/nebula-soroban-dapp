const Task = require('../models/Task');
const Transaction = require('../models/Transaction');
const cache = require('../utils/cache');

const OVERVIEW_CACHE_TTL_MS = 15_000;

async function getOverview(req, res) {
  const data = await cache.getOrCompute('stats:overview', OVERVIEW_CACHE_TTL_MS, async () => {
    const [statusCounts, categoryCounts, recentVolume] = await Promise.all([
      Task.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Task.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
            volume: { $sum: { $toDecimal: '$amount' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 30 },
      ]),
    ]);

    return {
      statusCounts,
      categoryCounts,
      dailyVolume: recentVolume.map((row) => ({
        date: row._id,
        volume: row.volume.toString(),
        count: row.count,
      })),
    };
  });

  res.json({ success: true, data });
}

async function getRecentActivity(req, res) {
  const activity = await Transaction.find().sort({ occurredAt: -1 }).limit(25);
  res.json({ success: true, data: activity });
}

module.exports = { getOverview, getRecentActivity };
