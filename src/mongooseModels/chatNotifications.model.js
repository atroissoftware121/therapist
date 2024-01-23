const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

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
chatNotificationSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('chatNotifications', chatNotificationSchema);
