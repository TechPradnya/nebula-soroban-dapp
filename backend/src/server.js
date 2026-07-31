const http = require('http');
const createApp = require('./app');
const attachRealtime = require('./realtime');
const { connectDatabase } = require('./config/database');
const indexerService = require('./services/indexerService');
const env = require('./config/env');
const logger = require('./utils/logger');

async function main() {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  const { broadcast } = attachRealtime(server);
  indexerService.setBroadcaster(broadcast);
  indexerService.start();

  server.listen(env.port, () => {
    logger.info(`Nebula API listening on port ${env.port} [${env.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    indexerService.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
