const mongoose = require('mongoose');

const sessionDataSchema = new mongoose.Schema(
  {
    individualId: { type: String, require: true },
    therapistsDetails: [
      {
        therapistId: { type: String, require: true },
        therapistName: { type: String, require: true },
        sessionStartTime: { type: String, require: true },
        sessionEndTime: { type: String, require: true },
        isSessionStart: { type: Boolean, default: false },
        chat: { type: String, require: true },
        chatDuration:{ type: String, require: true },
        consulted:{ type: String, require: true },
        chatCharges: { type: Number, require: true }
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('sessions', sessionDataSchema);
