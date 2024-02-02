const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Types.ObjectId, default: null },
    userId: { type: mongoose.Types.ObjectId, default: null },
    cost: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('transactions', transactionSchema);
