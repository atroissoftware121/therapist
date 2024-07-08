const mongoose =  require('mongoose');

const adminSettingSchema = new mongoose.Schema({
  commissionPercentage: {
    type: Number,
    default: 5
  }
})

const adminSettingModel = mongoose.model('adminSetting', adminSettingSchema);

module.exports = adminSettingModel;