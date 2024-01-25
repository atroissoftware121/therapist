const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const {
  findQuery,
  updateQuery,
  findQueryWithPagining,
} = require('../helpers/mongooseHelpers');

const admin = require('firebase-admin');
const { firebaseConfig } = require('../config/firebase-admin');
const catchAsync = require('../utils/catchAsync');
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
});
const pick = require('../utils/pick');
const { getFileStream, uploadFileS3 } = require('../helpers/s3Helper');
const userExtraDetailsModel = require('../mongooseModels/userExtraDetails.model');
const chatNotificationsModel = require('../mongooseModels/chatNotifications.model');
const authCredtionalsModel = require('../mongooseModels/authCredtionals.model');
const therapistModel = require('../mongooseModels/therapist.model');
const individualModel = require('../mongooseModels/individual.model');

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
  if (receiverDetail && receiverDetail.fcmToken) {
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
        body: data.body,
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

const chatHistory = async (req, res) => {
  try {
    let { userId } = req.user;
    const options = pick(req.query, ['limit', 'page']);
    const chats = await findQueryWithPagining(
      chatNotificationsModel,
      {
        $or: [
          {
            senderId: userId,
          },
          {
            receiverId: userId,
          },
        ],
      },
      options
    );
    return SendSuccessResponse({ res, data: chats });
  } catch (error) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: error.message },
    });
  }
};

const getProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const [isUserExists] = await findQuery(authCredtionalsModel, { userId });
    if (!isUserExists) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'User not found!' },
      });
    }

    const getProfileData = await findQuery(
      isUserExists.userType === 'therapist' ? therapistModel : individualModel,
      { _id: userId }
    );
    if (!getProfileData) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'User not found!' },
      });
    }

    return SendSuccessResponse({ res, data: { getProfileData } });
  } catch (err) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: err.message },
    });
  }
}

module.exports = {
  GetImage,
  UploadImages,
  Logout,
  sentPushNotifications,
  chatHistory,
  getProfile,
};
