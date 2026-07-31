const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

mongoose.set('strictQuery', true);

async function connectDatabase() {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost');
  });

  await mongoose.connect(env.mongoUri, {
    autoIndex: env.nodeEnv !== 'production',
    serverSelectionTimeoutMS: 10000,
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
