const mongoose = require("mongoose");

const otpSentSchema = new mongoose.Schema(
  {
    otp: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    sendTimes: { type: Number, default: 1 },
    lastOtpSentTime: { type: Date, default: null },
    method: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("otpsent", otpSentSchema);
