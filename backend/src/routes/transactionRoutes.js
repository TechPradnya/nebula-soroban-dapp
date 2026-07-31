const express = require('express');
const taskController = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const taskValidation = require('../validations/taskValidation');

const router = express.Router();

router.post('/build', requireAuth, validate(taskValidation.buildTx), taskController.buildTransaction);
router.post('/submit', requireAuth, validate(taskValidation.submitTx), taskController.submitTransaction);

module.exports = router;
