const mongoose = require("mongoose");

const userExtraDetailsSchema = new mongoose.Schema(
  {
    lastLogin: { type: Date, default: Date.now() },
    lastJWTToken: { type: String, default: null },
    fcmToken: { type: String, default: null },
    deviceInfo: { type: String, default: null },
    isUserLogout: { type: Boolean, default: true },
    userId: { type: mongoose.Types.ObjectId, default: null },
    lastLogout: {
      type: Date,
      default: null
    },
    userType: { type: String, enum: ['individual', 'therapists'] },
    email: { type: String, required: false }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("userExtraDetails", userExtraDetailsSchema);
