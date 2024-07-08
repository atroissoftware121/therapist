const adminSettingModel = require('../mongooseModels/admin-setting.model');
const catchAsync = require('../utils/catchAsync');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');

const createAdminSetting = catchAsync(async(req, res) => {
  const addedAdminSetting = await adminSettingModel.create(req.body);
  return SendSuccessResponse({
    res,
    data: { addedAdminSetting },
  });});

const updateAdminSetting = catchAsync(async(req, res) => {
  const updatedAdminSetting = await adminSettingModel.updateOne({}, req.body, {new: true});
  return SendSuccessResponse({
    res,
    data: { updatedAdminSetting },
  });});

module.exports = {
  createAdminSetting,
  updateAdminSetting
}