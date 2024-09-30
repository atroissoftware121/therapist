const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const callDetailsSchema = new mongoose.Schema(
  {
    callerId: { type: String, require: true },
    therapistsId: { type: mongoose.Schema.Types.ObjectId, ref: 'therapist' },
    individualId: { type: mongoose.Schema.Types.ObjectId, ref: 'individual' },
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
    isReview: { type: Boolean, default: false },
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

callDetailsSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('callDetails', callDetailsSchema);
