const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const sessionDataSchema = new mongoose.Schema(
  {
    sessionStartTime: { type: String, require: true },
    chatType: { type: String, enum: ['message', 'call'], require: true },
    sessionEndTime: { type: String, require: true },
    isSessionStart: { type: Boolean, default: false },
    individualId: { type: String, require: true },
    therapistsId: { type: String, require: true },
    isReview: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    sessionCost: { type: Number, default: 0 }
  },
  {
    timestamps: true,
  }
);
sessionDataSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('sessions', sessionDataSchema);
