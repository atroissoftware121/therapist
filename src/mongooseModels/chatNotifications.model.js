const mongoose = require("mongoose");

const chatNotificationSchema = new mongoose.Schema(
  {
    senderId: { type: String, require: true },
    senderName: { type: String, require: true },
    receiverId: { type: String, require: true },
    receiverName: { type: String, require: true },
    title: { type: String, require: true },
    body: { type: String, require: true },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("chatNotifications", chatNotificationSchema);
