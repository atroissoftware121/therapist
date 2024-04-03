const mongoose = require('mongoose');

const callDetailsSchema = new mongoose.Schema(
  {
    callerId: { type: String, require: true },
    eventType: { type: String, require: true },
    startTime: { type: Date, require: true },
    endTime: { type: Date, require: true },
    status: { type: String, require: true },
    from: { type: String, require: true },
    to: { type: String, require: true },
    phoneNumberSid: { type: String, require: true },
    direction: { type: String, require: true },
    recordingUrl: { type: String, require: true, default: null },
    conversationDuration: { type: Number, require: true },
    legs: [
      {
        userType: { type: String, require: true },
        onCallDuration: { type: Number, require: true },
        status: { type: String, require: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('callDetails', callDetailsSchema);
