const mongoose = require("mongoose");

const individualSchema = new mongoose.Schema(
  {
    fname: { type: String, default: null },
    lname: { type: String, default: null },
    image: { type: String, default: null },
    email: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    gender: { type: String, default: null },
    notification: { type: mongoose.Types.ObjectId, ref: "notification" },
    userExtraDetails: {
      type: mongoose.Types.ObjectId,
      ref: "userExtraDetails",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("individual", individualSchema);
