const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'task_accepted',
        'work_submitted',
        'task_completed',
        'task_disputed',
        'dispute_resolved',
        'reward_available',
        'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    relatedTaskId: { type: Number, default: null },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Notification', notificationSchema);
