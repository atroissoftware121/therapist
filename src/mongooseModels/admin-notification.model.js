const mongoose = require('mongoose');

const adminNotificationSchema = new mongoose.Schema({
  users: {
    type: String,
    required: true,
    enum: ['individual', 'therapist', 'both']
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },

}, {
  timestamps: true
})

const adminNotificationModel = mongoose.model('adminNotificationSchema', adminNotificationSchema);

module.exports = adminNotificationModel;