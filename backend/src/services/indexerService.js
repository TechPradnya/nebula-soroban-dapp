const stellarService = require('./stellarService');
const Task = require('../models/Task');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const IndexerState = require('../models/IndexerState');
const env = require('../config/env');
const logger = require('../utils/logger');

let timer = null;
let broadcast = null; // injected by app.js, wraps the SSE/WebSocket layer

/** Allows app.js to give the indexer a way to push real-time updates out. */
function setBroadcaster(fn) {
  broadcast = fn;
}

async function getState(contract) {
  let state = await IndexerState.findOne({ contract });
  if (!state) {
    const startLedger = await stellarService.getLatestLedger();
    state = await IndexerState.create({ contract, lastProcessedLedger: startLedger });
  }
  return state;
}

async function notifyUserByAddress(address, payload) {
  const user = await User.findOne({ walletAddress: address });
  if (!user) return;
  const notification = await Notification.create({ user: user._id, ...payload });
  if (broadcast) broadcast(user._id.toString(), notification);
}

async function handleMarketplaceEvent(event) {
  const [eventName] = event.topics;
  const [taskId] = event.value?.length ? event.value : [null];

  const txRecord = {
    txHash: event.txHash,
    ledger: event.ledger,
    contract: 'marketplace',
    eventType: eventName,
    actorAddress: event.topics[1] || 'unknown',
    relatedTaskId: typeof taskId === 'bigint' ? Number(taskId) : taskId,
    occurredAt: new Date(),
  };

  await Transaction.updateOne({ txHash: event.txHash }, { $setOnInsert: txRecord }, { upsert: true });

  switch (eventName) {
    case 'task_created':
      // The frontend writes full metadata (title, description, tags) right
      // after its create_task tx confirms. This upsert is a safety net —
      // if that write hasn't landed yet, or never arrives, the task still
      // shows up on-chain-accurate with placeholder metadata rather than
      // vanishing from the marketplace entirely.
      await Task.updateOne(
        { onChainId: txRecord.relatedTaskId },
        {
          $set: { status: 'open', 'txHashes.created': event.txHash },
          $setOnInsert: {
            title: `Task #${txRecord.relatedTaskId}`,
            description: 'Metadata pending sync.',
            category: 'other',
            clientAddress: txRecord.actorAddress,
            amount: '0',
            feeBps: 0,
          },
        },
        { upsert: true },
      );
      break;
    case 'task_accepted':
      await Task.updateOne(
        { onChainId: txRecord.relatedTaskId },
        {
          $set: {
            status: 'in_progress',
            freelancerAddress: txRecord.actorAddress,
            'txHashes.accepted': event.txHash,
          },
        },
      );
      break;
    case 'work_submitted':
      await Task.updateOne(
        { onChainId: txRecord.relatedTaskId },
        { $set: { status: 'submitted', 'txHashes.submitted': event.txHash } },
      );
      break;
    case 'task_completed': {
      const task = await Task.findOneAndUpdate(
        { onChainId: txRecord.relatedTaskId },
        { $set: { status: 'completed', 'txHashes.completed': event.txHash } },
        { new: true },
      );
      if (task) {
        await notifyUserByAddress(task.freelancerAddress, {
          type: 'task_completed',
          title: 'Payment released',
          body: `Task "${task.title}" was approved and paid out.`,
          relatedTaskId: task.onChainId,
        });
      }
      break;
    }
    case 'task_cancelled':
      await Task.updateOne({ onChainId: txRecord.relatedTaskId }, { $set: { status: 'cancelled' } });
      break;
    case 'task_disputed':
      await Task.updateOne({ onChainId: txRecord.relatedTaskId }, { $set: { status: 'disputed' } });
      break;
    case 'dispute_resolved':
      await Task.updateOne({ onChainId: txRecord.relatedTaskId }, { $set: { status: 'resolved' } });
      break;
    default:
      logger.warn(`Unhandled marketplace event type: ${eventName}`);
  }

  if (broadcast) broadcast('marketplace:event', txRecord);
}

// The staking contract emits event topics via Soroban's Symbol::short,
// which has a hard 9-character limit — so on-chain it's literally "fee",
// not "fee_deposited". We translate at the ingestion boundary so the
// database and frontend can use a name that actually describes what
// happened, without that constraint leaking into every consumer.
const STAKING_TOPIC_TO_EVENT_TYPE = {
  stake: 'stake',
  unstake: 'unstake',
  claim: 'claim',
  fee: 'fee_deposited',
};

async function handleStakingEvent(event) {
  const [rawTopic] = event.topics;
  const eventType = STAKING_TOPIC_TO_EVENT_TYPE[rawTopic];
  if (!eventType) {
    logger.warn(`Unrecognized staking event topic: ${rawTopic}`);
    return;
  }
  const actorAddress = event.topics[1] || 'unknown';

  const txRecord = {
    txHash: event.txHash,
    ledger: event.ledger,
    contract: 'staking',
    eventType,
    actorAddress,
    amount: String(event.value ?? ''),
    occurredAt: new Date(),
  };

  await Transaction.updateOne({ txHash: event.txHash }, { $setOnInsert: txRecord }, { upsert: true });

  if (eventType === 'fee_deposited') {
    if (broadcast) broadcast('staking:fee_deposited', txRecord);
  }
}

async function pollContract(contractId, contractLabel, handler) {
  if (!contractId) return;
  const state = await getState(contractLabel);
  const latest = await stellarService.getLatestLedger();
  if (state.lastProcessedLedger >= latest) return;

  const events = await stellarService.getContractEvents(contractId, state.lastProcessedLedger + 1);
  for (const event of events) {
    // eslint-disable-next-line no-await-in-loop
    await handler(event);
  }

  state.lastProcessedLedger = latest;
  await state.save();
}

async function pollOnce() {
  try {
    await pollContract(env.stellar.marketplaceContractId, 'marketplace', handleMarketplaceEvent);
    await pollContract(env.stellar.stakingContractId, 'staking', handleStakingEvent);
  } catch (err) {
    logger.error(`Indexer poll failed: ${err.message}`);
  }
}

function start() {
  if (timer) return;
  logger.info(`Starting event indexer, polling every ${env.indexer.pollIntervalMs}ms`);
  timer = setInterval(pollOnce, env.indexer.pollIntervalMs);
  pollOnce();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { start, stop, pollOnce, setBroadcaster };
