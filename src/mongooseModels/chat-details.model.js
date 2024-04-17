const mongoose = require('mongoose');

const chatDetailsSchema = new mongoose.Schema(
  {
    receiverId: { type: String, require: true },
    receiverName: { type: String, require: true },
    chatType: { type: String, enum: ['message', 'call'], require: true },
    individualDetails: [{
      senderId: { type: String, require: true },
      senderName: { type: String, require: true },
      email: { type: String, require: true},
      mobileNumber: { type: String, require: true},
      gender: { type: String, require: true},
      sessionId: { type: String, default: null},
      timing: { type: Number, default: 0 },
    }]
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('chatDetails', chatDetailsSchema);
