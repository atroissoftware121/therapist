const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null, refPath: 'userType' },
    userType: { type: String, required: true },
    notifications: [{
      title: {
        type: String,
        required: false,
      },
      message: {
        type: String,
        required: false,
      },
    }],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("notification", notificationSchema);
