const {
  rpc,
  Contract,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
} = require('@stellar/stellar-sdk');
const env = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

const server = new rpc.Server(env.stellar.sorobanRpcUrl, { allowHttp: false });
const NETWORK_PASSPHRASE =
  env.stellar.network === 'PUBLIC' ? Networks.PUBLIC : Networks.TESTNET;

/**
 * Converts a plain JS args array into ScVals the contract expects.
 * `spec` is a list of type hints ('address' | 'i128' | 'u32' | 'string')
 * matched positionally against `args`.
 */
function toScVals(args, spec) {
  return args.map((value, i) => {
    const type = spec[i];
    if (type === 'address') return nativeToScVal(value, { type: 'address' });
    if (type === 'i128') return nativeToScVal(BigInt(value), { type: 'i128' });
    if (type === 'u32') return nativeToScVal(value, { type: 'u32' });
    if (type === 'u64') return nativeToScVal(BigInt(value), { type: 'u64' });
    return nativeToScVal(value, { type: 'string' });
  });
}

/**
 * Builds an unsigned, simulated transaction invoking `method` on
 * `contractId`. The backend NEVER holds a user's signing key — this XDR is
 * returned to the frontend, signed there via Freighter/Albedo/xBull
 * through StellarWalletsKit, and the signed XDR is posted back to
 * `submitSignedTransaction`.
 */
async function buildContractCallTx({ contractId, method, args = [], argTypes = [], sourceAddress }) {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(contractId);
  const scArgs = toScVals(args, argTypes);

  let tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...scArgs))
    .setTimeout(60)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw ApiError.badRequest(`Contract simulation failed: ${simulated.error}`);
  }

  tx = rpc.assembleTransaction(tx, simulated).build();
  return tx.toXDR();
}

/** Submits a wallet-signed transaction and polls until it settles. */
async function submitSignedTransaction(signedXdr) {
  const { TransactionBuilder: TB } = require('@stellar/stellar-sdk');
  const tx = TB.fromXDR(signedXdr, NETWORK_PASSPHRASE);

  const sendResult = await server.sendTransaction(tx);

if (sendResult.status === 'ERROR') {
  throw ApiError.badRequest(
    `Transaction submission was rejected: ${JSON.stringify(sendResult)}`
  );
}

  const hash = sendResult.hash;
  let response = await server.getTransaction(hash);
  const start = Date.now();
  while (response.status === 'NOT_FOUND' && Date.now() - start < 30_000) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await server.getTransaction(hash);
  }

  if (response.status !== 'SUCCESS') {
    logger.warn(`Transaction ${hash} settled with status ${response.status}`);
    throw ApiError.badRequest(`Transaction failed on-chain: ${response.status}`);
  }

  let returnValue = null;
  try {
    if (response.returnValue) returnValue = scValToNative(response.returnValue);
  } catch (err) {
    logger.warn(`Could not decode return value for tx ${hash}: ${err.message}`);
  }

  return { hash, ledger: response.ledger, returnValue };
}

/** Read-only contract call (no signing/fees), used for dashboards/detail views. */
async function readContractState({ contractId, method, args = [], argTypes = [] }) {
  const contract = new Contract(contractId);
  const scArgs = toScVals(args, argTypes);

  const dummySource =
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'; // valid-format placeholder, never funded
  let account;
  try {
    account = await server.getAccount(dummySource);
  } catch (err) {
    account = { accountId: () => dummySource, sequenceNumber: () => '0', incrementSequenceNumber: () => {} };
  }

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...scArgs))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(simulated)) {
    throw ApiError.badRequest(`Read call failed: ${simulated.error}`);
  }

  return scValToNative(simulated.result.retval);
}

/** Fetches contract events since `startLedger`, used by the indexer. */
/** Runs several read-only contract calls concurrently and returns them by name. */
async function readContractStateBatch(calls) {
  const entries = Object.entries(calls);
  const results = await Promise.all(entries.map(([, params]) => readContractState(params)));
  return Object.fromEntries(entries.map(([name], i) => [name, results[i]]));
}

async function getContractEvents(contractId, startLedger) {
  const response = await server.getEvents({
    startLedger,
    filters: [{ type: 'contract', contractIds: [contractId] }],
    limit: 100,
  });

  return response.events.map((event) => ({
    id: event.id,
    ledger: event.ledger,
    contractId: event.contractId,
    topics: event.topic.map((t) => scValToNative(t)),
    value: scValToNative(event.value),
    txHash: event.txHash,
  }));
}

async function getLatestLedger() {
  const { sequence } = await server.getLatestLedger();
  return sequence;
}

module.exports = {
  buildContractCallTx,
  submitSignedTransaction,
  readContractState,
  readContractStateBatch,
  getContractEvents,
  getLatestLedger,
};
