const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const individualSchema = new mongoose.Schema(
  {
    fname: { type: String, default: null },
    lname: { type: String, default: null },
    image: { type: String, default: 'e64ce55739293cc4f4835f6f762e444a' },
    email: { type: String, default: null },
    mobileNumber: { type: String, default: null },
    gender: { type: String, default: null },
    notification: { type: mongoose.Types.ObjectId, ref: "notification" },
    wallet: { type: Number, default: 0 },
    loyaltyPoints: { type: Number, default: 0 },
    userExtraDetails: {
      type: mongoose.Types.ObjectId,
      ref: "userExtraDetails",
    },
  },
  {
    timestamps: true,
  }
);
individualSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("individual", individualSchema);
