const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    notifications: [],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("notification", notificationSchema);
