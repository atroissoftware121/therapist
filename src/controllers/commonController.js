const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const { findQuery, updateQuery } = require('../helpers/mongooseHelpers');

const admin = require('firebase-admin');
const { firebaseConfig } = require('../config/firebase-admin');
const catchAsync = require('../utils/catchAsync');
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});

const { getFileStream, uploadFileS3 } = require('../helpers/s3Helper');
const userExtraDetailsModel = require('../mongooseModels/userExtraDetails.model');
const chatNotificationsModel = require('../mongooseModels/chatNotifications.model');

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
        error: 'somethings went wrong!',
      },
    });
  return SendSuccessResponse({
    res,
    data: {
      message: 'Image upload successfully!',
      imageURI,
    },
  });
};
const Logout = async (req, res) => {
  try {
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
  } catch (error) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: error.message },
    });
  }
};

const sentPushNotifications = catchAsync(async (req, res) => {
  const data = req.body;
  let [receiverDetail] = await findQuery(userExtraDetailsModel, {
    userId: data.receiverId,
  });
  if (receiverDetail) {
    const message = {
      notification: {
        title: data.title,
        body: data.message,
      },
      data: {
        senderId: data.senderId,
        senderName: data.senderName,
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        title: data.title,
        body: data.message,
      },
      token: receiverDetail.fcmToken,
    };

    const response = await admin.messaging().send(message);
    const update = {
      $set: {
        senderId: data.senderId,
        senderName: data.senderName,
        receiverId: data.receiverId,
        receiverName: data.receiverName,
        title: data.title,
      },
    };
    await updateQuery(
      chatNotificationsModel,
      {
        $or: [
          {
            $and: [
              { senderId: data.senderId },
              { receiverId: data.receiverId },
            ],
          },
          {
            $and: [
              { senderId: data.receiverId },
              { receiverId: data.senderId },
            ],
          },
        ],
      },
      update
    );

    return SendSuccessResponse({ res, data: response });
  }
  return SendBadResponse({
    res,
    status: 403,
    data: { message: 'Receiver Not found' },
  });
});

module.exports = { GetImage, UploadImages, Logout, sentPushNotifications };
