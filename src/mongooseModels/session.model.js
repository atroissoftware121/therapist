const mongoose = require('mongoose');

const sessionDataSchema = new mongoose.Schema(
  {
    sessionStartTime: { type: String, require: true },
    chatType: { type: String, enum: ['message', 'call'], require: true },
    sessionEndTime: { type: String, require: true },
    isSessionStart: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('sessions', sessionDataSchema);
