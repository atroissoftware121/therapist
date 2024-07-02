const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const sessionDataSchema = new mongoose.Schema(
  {
    sessionStartTime: { type: Date, require: true },
    chatType: { type: String, enum: ['message', 'call'], require: true },
    sessionEndTime: { type: Date, require: true },
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
