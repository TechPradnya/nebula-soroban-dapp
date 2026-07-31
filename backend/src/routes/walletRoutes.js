const express = require('express');
const walletController = require('../controllers/walletController');

const router = express.Router();

router.get('/:address/staking', walletController.getStakingSummary);
router.get('/:address/transactions', walletController.getTransactionHistory);

module.exports = router;
