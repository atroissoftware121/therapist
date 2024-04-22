const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    fund_id: { type: String, default: null },
    contact_id: { type: String, default: null },
    therapistId: { type: String, default: null },
    account_type: { type: String, default: null },
    bank_account: {
      ifsc: { type: String, default: null },
      bank_name: { type: String, default: null },
      name: { type: String, default: null },
      account_number: { type: String, default: null },
    },
    active: { type: Boolean, default: false },
    batch_id: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('transactions', transactionSchema);
