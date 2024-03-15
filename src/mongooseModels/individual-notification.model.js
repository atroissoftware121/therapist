const mongoose = require('mongoose');

const individualNotificationSchema = new mongoose.Schema(
  {
    individualId: { type: String, default: null },
    therapistsIds: { type: [String], default: null },
    notify: { type: String, default: 'once' },
    isNotify: { type: Boolean, default: false },
    fcmToken: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('individualNotification', individualNotificationSchema);
