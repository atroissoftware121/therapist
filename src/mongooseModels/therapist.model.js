const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
const therapistSchema = new mongoose.Schema(
  {
    name: { type: String, default: null },
    image: { type: String, default: null },
    age: { type: Number, default: 0 },
    mobileNumber: { type: String, default: null },
    email: { type: String, default: null },
    gender: { type: String, default: null },
    specialization: [{ type: String }],
    charges: { type: Number, default: 0 },
    qualification: { type: String, default: null },
    discountedCharges: { type: Number, default: 0 },
    location: { type: String, default: null },
    language: { type: String, default: null },
    experience: { type: Number, default: 0 },
    summary: { type: String, default: null },
    isOnline: { type: Boolean, default: false },
    onCall: { type: Boolean, default: false },
    isMessageQueue: { type: Boolean, default: false },
    isCallQueue: { type: Boolean, default: false },
    isProfileVerified: { type: Boolean, default: false },
    documents: [{ name: { type: String }, image: { type: String } }],
    isAdmin: { type: Boolean, default: false },
    wallet: { type: Number, default: 0 },
    review: { type: Number, default: 0 },
    isInChat: { type: Boolean, default: false },
    notification: {
      type: mongoose.Types.ObjectId,
      ref: "notification",
      default: null,
    },
    userExtraDetails: {
      type: mongoose.Types.ObjectId,
      ref: "userExtraDetails",
      default: null,
    },
    isAccountRestricted: { type: Boolean, default: false },
    accountRestictionMessage: { type: String, default: null },
    isWalletRestricted: { type: Boolean, default: false },
    wallletRestictionMessage: { type: String, default: null },
    isTherapistRegistrationStepFirst: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);
// add plugin that converts mongoose to json
therapistSchema.plugin(mongoosePaginate);
module.exports = mongoose.model("therapist", therapistSchema);
