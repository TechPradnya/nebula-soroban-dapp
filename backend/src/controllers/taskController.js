const taskService = require('../services/taskService');
const stellarService = require('../services/stellarService');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

async function listTasks(req, res) {
  const result = await taskService.listTasks(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
}

async function getTask(req, res) {
  const task = await taskService.getTaskByOnChainId(Number(req.params.id));
  res.json({ success: true, data: task });
}

async function getMyTasks(req, res) {
  if (!req.user.walletAddress) {
    throw ApiError.badRequest('Link a wallet address to your profile first');
  }
  const tasks = await taskService.getTasksByAddress(req.user.walletAddress);
  res.json({ success: true, data: tasks });
}

async function createTaskRecord(req, res) {
  const task = await taskService.createTaskRecord(req.body);
  res.status(201).json({ success: true, data: task });
}

/**
 * Builds an unsigned transaction XDR for the requested contract method.
 * The frontend signs this with the connected wallet and posts it back to
 * `POST /transactions/submit`. The backend never sees a private key.
 */
async function buildTransaction(req, res) {
  const { contract, method, args, argTypes, sourceAddress } = req.body;
  const contractId =
    contract === 'staking' ? env.stellar.stakingContractId : env.stellar.marketplaceContractId;

  if (!contractId) {
    throw ApiError.internal(`${contract} contract id is not configured on the server`);
  }

  const xdr = await stellarService.buildContractCallTx({
    contractId,
    method,
    args,
    argTypes,
    sourceAddress,
  });

  res.json({ success: true, data: { xdr } });
}

async function submitTransaction(req, res) {
  const result = await stellarService.submitSignedTransaction(req.body.signedXdr);
  res.json({ success: true, data: result });
}

module.exports = { listTasks, getTask, getMyTasks, createTaskRecord, buildTransaction, submitTransaction };
