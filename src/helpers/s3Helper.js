const fs = require("fs");
const S3 = require("aws-sdk/clients/s3");
const {
  BUCKET_REGION,
  BUCKET_NAME,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
} = require("../config");

const util = require("util");
const multer = require("multer");
const unlinkFile = util.promisify(fs.unlink);

const s3 = new S3({
  region: BUCKET_REGION,
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
});

const upload = multer({ dest: "uploads/" });

// uploads a file to s3
function uploadFile(file) {
  const fileStream = fs.createReadStream(file.path);
  const uploadParams = {
    Bucket: BUCKET_NAME,
    Body: fileStream,
    Key: file.filename,
  };
  return s3.upload(uploadParams).promise();
}

function uploadFileS3(file) {
  return new Promise(async (resolve, reject) => {
    uploadFile(file)
      .then(async (imageResponse) => {
        await unlinkFile(file.path);
        resolve({ success: true, imageURI: imageResponse.Key });
      })
      .catch((err) => {
        console.log("err=>", err);
        resolve({ success: false });
      });
  });
}

// downloads a file from s3
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: BUCKET_NAME,
  };
  return s3.getObject(downloadParams).createReadStream();
}

module.exports = {
  upload,
  uploadFileS3,
  getFileStream,
};
