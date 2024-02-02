const mongoose = require('mongoose');

const sessionDataSchema = new mongoose.Schema(
  {
    sessionStartTime: { type: String, require: true },
    sessionEndTime: { type: String, require: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('sessions', sessionDataSchema);
