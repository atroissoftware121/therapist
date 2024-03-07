const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Types.ObjectId, default: null },
    email: { type: String, require: true },
    description: { type: String, require: true },
    userType: { type: String, require: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('report', reportSchema);
