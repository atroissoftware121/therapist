const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  individualId: { type: String, require: true },
  therapistId: { type: String, require: true },
  comments: { type: String, default: null },
  rating: { type: Number, default: 0 },
});

module.exports = mongoose.model('reviews', reviewSchema);
