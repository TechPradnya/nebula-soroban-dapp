require('dotenv').config();

/**
 * Single source of truth for environment configuration. Every other module
 * imports from here instead of touching `process.env` directly, so a
 * missing variable fails fast at boot instead of surfacing as a confusing
 * runtime bug three layers deep.
 */
const required = ['MONGO_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key] && process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nebula',

  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  stellar: {
    network: process.env.STELLAR_NETWORK || 'TESTNET',
    sorobanRpcUrl: process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org',
    horizonUrl: process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org',
    marketplaceContractId: process.env.MARKETPLACE_CONTRACT_ID || '',
    stakingContractId: process.env.STAKING_CONTRACT_ID || '',
    platformTokenContractId: process.env.PLATFORM_TOKEN_CONTRACT_ID || '',
  },

  indexer: {
    pollIntervalMs: parseInt(process.env.EVENT_POLL_INTERVAL_MS, 10) || 5000,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
  },
};
