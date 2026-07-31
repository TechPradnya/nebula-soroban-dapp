const { WebSocketServer } = require('ws');
const logger = require('./utils/logger');

/**
 * Thin real-time layer over the indexer. Rather than clients polling the
 * REST API for status changes, the indexer calls `broadcast(channel, data)`
 * whenever it processes a new on-chain event, and every connected socket
 * that has subscribed to that channel gets it pushed immediately. This is
 * what makes task status, staking rewards, and notifications feel live in
 * the dashboard instead of only updating on refresh.
 */
function attachRealtime(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const subscriptions = new Map(); // channel -> Set<ws>

  wss.on('connection', (socket) => {
    socket.channels = new Set();

    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && typeof msg.channel === 'string') {
          socket.channels.add(msg.channel);
          if (!subscriptions.has(msg.channel)) subscriptions.set(msg.channel, new Set());
          subscriptions.get(msg.channel).add(socket);
        }
        if (msg.type === 'unsubscribe' && typeof msg.channel === 'string') {
          socket.channels.delete(msg.channel);
          subscriptions.get(msg.channel)?.delete(socket);
        }
      } catch (err) {
        logger.warn(`Malformed websocket message: ${err.message}`);
      }
    });

    socket.on('close', () => {
      for (const channel of socket.channels) {
        subscriptions.get(channel)?.delete(socket);
      }
    });
  });

  function broadcast(channel, payload) {
    const sockets = subscriptions.get(channel);
    if (!sockets || sockets.size === 0) return;

    const message = JSON.stringify({ channel, payload, ts: Date.now() });
    for (const socket of sockets) {
      if (socket.readyState === socket.OPEN) socket.send(message);
    }
  }

  return { broadcast };
}

module.exports = attachRealtime;
