const express = require('express');
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const transactionRoutes = require('./transactionRoutes');
const walletRoutes = require('./walletRoutes');
const notificationRoutes = require('./notificationRoutes');
const statsRoutes = require('./statsRoutes');

const router = express.Router();

router.get('/health', (req, res) => res.json({ success: true, status: 'ok', time: new Date().toISOString() }));

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/transactions', transactionRoutes);
router.use('/wallets', walletRoutes);
router.use('/notifications', notificationRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
