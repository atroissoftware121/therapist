const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const {
  findQuery,
  updateQuery,
  findQueryWithPagining,
  createQuery,
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
const chatDetailsModel = require('../mongooseModels/chat-details.model');
const sessionModel = require('../mongooseModels/session.model');
const individualTransactionModel = require('../mongooseModels/individual-transaction.model');

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

const sentPushNotifications = (io) => catchAsync(async (req, res) => {
  try {
    const data = req.body;
    let [receiverDetail] = await findQuery(userExtraDetailsModel, {
      userId: data.receiverId,
    });
    const individualData = await findQuery(individualModel, { _id: data.senderId });
    const therapistsData = await findQuery(therapistModel, { _id: data.receiverId });
    console.log('data', individualData, therapistsData);
    if (!individualData || !therapistsData) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'User not found!' },
      });
    };

    if (receiverDetail && receiverDetail.fcmToken) {
      const message = {
        notification: {
          title: data.title,
          body: data.message,
        },
        data: {
          senderId: data.senderId,
          senderName: `${individualData.fname} ${individualData.lname}`,
          receiverId: data.receiverId,
          receiverName: therapistsData.name,
          title: data.title,
          body: data.message,
        },
        token: receiverDetail.fcmToken,
      };

      const response = await admin.messaging().send(message);

      const individualObj = {
        senderId: data.senderId,
        senderName: `${individualData.fname} ${individualData.lname}`,
        email: individualData.email,
        mobileNumber: individualData.mobileNumber,
        gender: individualData.gender,
      }
      const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: data.receiverId });
      let messageData;
      if (isChatExisted) {
        const isSenderPresent = isChatExisted.individualDetails.some(detail => detail.senderId === data.senderId);

        if (!isSenderPresent) {
          messageData = await updateQuery(chatDetailsModel,
            {
              receiverId: data.receiverId,
              'individualDetails.senderId': { $ne: data.senderId }
            },
            {
              $set: {
                receiverName: therapistsData.name
              },
              $addToSet: {
                individualDetails: individualObj,
              },
            },
          )
        }
      } else {
        messageData = await createQuery(chatDetailsModel, {
          receiverId: data.receiverId,
          receiverName: therapistsData.name,
          individualDetails: [individualObj],
        });
      }
      console.log('emit', [messageData?.individualDetails]);

      io.to(data.receiverId).emit('chat-details', { data: [messageData?.individualDetails] });
      
      return SendSuccessResponse({ res, data: response });

    }
    return SendBadResponse({
      res,
      status: 403,
      data: { message: 'Receiver Not found' },
    });
  } catch (err) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: err.message },
    });
  }
})

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

const startSession = (io) => async (req, res) => {
  const { individualId, therapistsId } = req.query;

  const [userChatDetails] = await findQuery(chatDetailsModel,
    {
      receiverId: therapistsId,
      'individualDetails.senderId': { $eq: individualId }
    });

  const therapistsData = await findQuery(therapistModel, { _id: therapistsId});
  
  if (!userChatDetails) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User details not found!' },
    });
  }

  const sessionStartTime = new Date();
  const [sessionDataExisted] = await findQuery(sessionModel, { individualId });
  let therapistObj = {
    therapistName: therapistsData.name,
    isSessionStart: true,
    chat: 'message',
    sessionStartTime,
  }
  let session;
  if(sessionDataExisted) {
    const isSessionExist = sessionDataExisted.therapistsDetails.some(detail => detail.therapistId === therapistsId);
    if (!isSessionExist) {
      session = await updateQuery(sessionModel,
        {
          individualId,
          'therapistsDetails.therapistId': { $ne: therapistsId }
        },
        {
          $addToSet: {
            therapistsDetails: therapistObj,
          },
        },
      )
    }
  }else {
    session = await createQuery(sessionModel, {
      individualId,
      therapistsDetails: therapistObj
    });
  }
  const data = {
    individualId,
    therapistsId,
    isSessionStart: therapistObj.isSessionStart,
    sessionId: session._id,
    startSession: sessionStartTime,
  };

  io.emit('startTimer', data);

  await updateQuery(chatDetailsModel,
    {
      receiverId: therapistsId,
      'individualDetails.senderId': { $eq: individualId }
    },
    {
      $set: {
        'individualDetails.$.sessionId': session._id,
      },
    },
  );

  return SendSuccessResponse({ res, data: { session } });
};

const endSession = (io) => async (req, res) => {
  try {
    const { individualId, therapistsId, sessionId } = req.query;
    const data = {
      individualId,
      therapistsId,
      sessionId,
      isSessionStart: false,
    };

    io.emit('endTimer', data);
    const sessionData = await findQuery(sessionModel, { _id: sessionId });

    if (!sessionData) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'session not found!' },
      });
    }

    const sessionTime = new Date();
  
    const duration = (sessionTime - sessionData.sessionStartTime) / (1000 * 60);

    // Assume session cost per minute
    const costPerminute = 100; // used manually just for test
    const updatedSession = await updateQuery(sessionModel, 
      { individualId,
        'therapistsDetails.therapistId': { $eq: therapistsId }
      }, 
      {
        $set: {
          'individualDetails.$.sessionEndTime': sessionTime,
          'individualDetails.$.isSessionStart': false,
          'individualDetails.$.chatDuration': duration,
          'individualDetails.$.consulted': costPerminute,
          'individualDetails.$.chatCharges': duration * costPerminute,
        },
      },
    );

    console.log('updatedSession', updatedSession);

    const updateChatDetails = await updateQuery(
      chatDetailsModel,
      { receiverId: therapistsId },
      { $pull: { "individualDetails": { senderId: individualId, sessionId: sessionId } } },
    );

    return SendSuccessResponse({ res, data: { updateChatDetails } });
  } catch (err) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: err.message },
    });
  }
};

module.exports = {
  GetImage,
  UploadImages,
  Logout,
  sentPushNotifications,
  chatHistory,
  getProfile,
  startSession,
  endSession,
};
