const mongoose = require("mongoose");

const authCredtionalsSchema = new mongoose.Schema(
  {
    email: { type: String, default: null },
    password: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    userType: { type: String, default: null },
    userId: { type: mongoose.Types.ObjectId, default: null },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("authCredtionals", authCredtionalsSchema);
