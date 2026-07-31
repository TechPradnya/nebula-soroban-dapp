const express = require('express');
const taskController = require('../controllers/taskController');
const validate = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const taskValidation = require('../validations/taskValidation');

const router = express.Router();

router.get('/', validate(taskValidation.listTasks, 'query'), taskController.listTasks);
router.get('/mine', requireAuth, taskController.getMyTasks);
router.get('/:id', taskController.getTask);
router.post('/', requireAuth, validate(taskValidation.createTaskRecord), taskController.createTaskRecord);

module.exports = router;
