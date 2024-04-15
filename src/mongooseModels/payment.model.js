const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: { type: String, require: true },
    entity: { type: String, default: null },
    senderId: { type: String, default: null },
    recieverId: { type: String, default: null },
    amount: { type: Number, require: true },
    currency: { type: String, require: true },
    status: { type: String, require: true },
    description: { type: String, require: true },
    email: { type: String, require: true },
    contact: { type: String, require: true },
    order_id: { type: String, require: true },
    paymentType: { type: String, require: true },
    refundAmount: { type: String, default: 0 },
    bank: { type: String, default: null },
    wallet: { type: String, default: null },
    card_id: { type: String, require: false },
    card: {
      name: { type: String, require: false },
      network: { type: String, require: false },
      type: { type: String, require: false },
    },
    upi_id: { type: String, require: false },
    bank: { type: String, default: null },
    bank_transaction_id: { type: String, require: false },
    wallet_transaction_id: { type: String, require: false }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('payment', paymentSchema);
