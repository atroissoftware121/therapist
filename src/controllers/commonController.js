const {
  SendBadResponse,
  SendSuccessResponse,
} = require("../helpers/responseHelpers");
const { getFileStream, uploadFileS3 } = require("../helpers/s3Helper");

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

module.exports = { GetImage, UploadImages };
