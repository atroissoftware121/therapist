const adminSettingModel = require('../mongooseModels/admin-setting.model');
const catchAsync = require('../utils/catchAsync');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const individualModel = require('../mongooseModels/individual.model');
const { uploadFileS3 } = require('../helpers/s3Helper');


const createAdminSetting = catchAsync(async (req, res) => {
  const addedAdminSetting = await adminSettingModel.create(req.body);
  return SendSuccessResponse({
    res,
    data: { addedAdminSetting },
  });
});

const updateAdminSetting = catchAsync(async (req, res) => {
  const updatedAdminSetting = await adminSettingModel.updateOne({}, req.body, { new: true });
  return SendSuccessResponse({
    res,
    data: { updatedAdminSetting },
  });
});

const updateIndividualData = catchAsync(async (req, res) => {
  const file = req.file;
  console.log('file122', file);
  let imageURI;
  if(!file || file !== undefined) {
    console.log('abccccbcbbc');
    imageURI = await uploadFileS3(file);
  }
  const { individualId } = req.body;
  const updatedIndividualData = await individualModel.findOneAndUpdate({ _id: individualId }, { ...req.body, image: imageURI.Location || '' }, { new: true });
  return SendSuccessResponse({
    res,
    data: { updatedIndividualData },
  });
});

module.exports = {
  createAdminSetting,
  updateAdminSetting,
  updateIndividualData
}