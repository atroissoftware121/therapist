const {
  SendBadResponse,
  SendSuccessResponse,
} = require("../helpers/responseHelpers");
const { updateQuery } = require("../helpers/mongooseHelpers");
const { getFileStream, uploadFileS3 } = require("../helpers/s3Helper");
const userExtraDetailsModel = require("../mongooseModels/userExtraDetails.model");


const GetImage = async (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
};

const UploadImages = async (req, res) => {
  const file = req.file;
  let { success, imageURI } = await uploadFileS3(file);
  if (!success)
    return SendBadResponse({
      res,
      status: 500,
      data: {
        error: "somethings went wrong!",
      },
    });
  return SendSuccessResponse({
    res,
    data: {
      message: "Image upload successfully!",
      imageURI,
    },
  });
};
const Logout = async (req, res) => {
  try{
    let { userId } = req.user;
    await updateQuery(
      userExtraDetailsModel,
      { userId },
      {
        fcmToken: null,
        deviceInfo: null,
        isUserLogout: true,
      }
    );
    return SendSuccessResponse({ res, data: { userId } });
  }catch(error){
    return SendBadResponse({
      res,
      status: 403,
      data: { message: error.message },
    });
  }
};

module.exports = { GetImage, UploadImages, Logout };
