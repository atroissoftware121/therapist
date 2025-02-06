const mongoose = require('mongoose');

const paymentPayoutSchema = new mongoose.Schema(
  {
    payoutId: { type: String, require: true },
    entity: { type: String, default: null },
    fundId: { type: String, default: null },
    amount: { type: Number, require: true },
    fees: { type: Number, require: true },
    tax: { type: Number, require: true },
    status: { type: String, require: true },
    mode: { type: String, require: true },
    purpose: { type: String, require: true },
    reference_id: { type: String, require: true },
    narration: { type: String, require: true },
    currency: { type: String, require: true },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('paymentPayout', paymentPayoutSchema);
