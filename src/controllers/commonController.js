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
const reportModel = require('../mongooseModels/report.model');
const individualTransactionModel = require('../mongooseModels/individual-transaction.model');
const individualNotificationModel = require('../mongooseModels/individual-notification.model');
const callDetailsModel = require('../mongooseModels/callChat-details.model');

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
    console.log('receiverDetail', receiverDetail);
    const individualId = data.userType === 'individual' ? data.senderId : data.receiverId;
    const therapistsId = data.userType === 'therapists' ? data.senderId : data.receiverId;
    console.log('therapistsId', therapistsId, 'individualId', individualId);
    const individualData = await findQuery(individualModel, { _id: individualId });
    console.log('individualData', individualData);
    const therapistsData = await findQuery(therapistModel, { _id: therapistsId });

    if (!individualData || !therapistsData) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'User not found!' },
      });
    };
    console.log('reecceiei', )
    if (receiverDetail && receiverDetail.fcmToken) {
      const message = {
        notification: {
          title: data.title,
          body: data.message,
        },
        data: {
          senderId: data.senderId,
          senderName: data.userType === 'individual'? `${individualData.fname} ${individualData.lname}`: therapistsData.name,
          receiverId: data.receiverId,
          receiverName: data.userType === 'individual'? therapistsData.name : `${individualData.fname} ${individualData.lname}`,
          title: data.title,
          body: data.message,
        },
        token: receiverDetail.fcmToken,
      };
      console.log('data12', message);
      let response;
      if(data.userType === 'therapists') {
        response = await admin.messaging().send(message);
        return SendSuccessResponse({ res, data: response });
      }

      response = await admin.messaging().send(message);
      const individualObj = {
        senderId: data.senderId,
        senderName: `${individualData.fname} ${individualData.lname}`,
        email: individualData.email,
        mobileNumber: individualData.mobileNumber,

        gender: individualData.gender,
      }
      const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: data.receiverId, chatType: data.chatType });
      console.log('isChatExisted', isChatExisted);
      let messageData;
      if (isChatExisted) {
        const isSenderPresent = isChatExisted.individualDetails.some(detail => detail.senderId === data.senderId);
        console.log('isSenderPresent', isSenderPresent);
        if (!isSenderPresent) {
          messageData = await updateQuery(chatDetailsModel,
            {
              receiverId: data.receiverId,
              chatType: data.chatType,
              'individualDetails.senderId': { $ne: data.senderId }
            },
            {
              $set: {
                receiverName: therapistsData.name,
              },
              $addToSet: {
                individualDetails: individualObj,
              },
            },
          )
        } else {
          messageData = isChatExisted;
        }
      } else {
        messageData = await createQuery(chatDetailsModel, {
          receiverId: data.receiverId,
          receiverName: therapistsData.name,
          chatType: data.chatType,
          individualDetails: [individualObj],
        });
      }
      console.log('emit', messageData);
      if(data.chatType === 'message') {
        io.to(data.receiverId).emit('chat-details', { data: [messageData?.individualDetails], image: individualData.image });
      } else {
        io.to(data.receiverId).emit('chat-details-for-call', { data: [messageData?.individualDetails], image: individualData.image, timing: data.timing });
      }
      
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
      chatType: 'message',
      'individualDetails.senderId': { $eq: individualId }
    });
    

  if (!userChatDetails) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User details not found!' },
    });
  }

  const sessionStartTime = new Date();

  const createSession = await createQuery(sessionModel, { sessionStartTime, isSessionStart: true });
  const data = {
    individualId,
    therapistsId,
    chatType: 'message',
    isSessionStart: createSession.isSessionStart,
    sessionId: createSession._id,
    startSession: sessionStartTime,
  };
  io.emit('startTimer', data);

  await updateQuery(chatDetailsModel,
    {
      receiverId: therapistsId,
      chatType: 'message',
      'individualDetails.senderId': { $eq: individualId }
    },
    {
      $set: {
        'individualDetails.$.sessionId': createSession._id,
      },
    },
  );

  return SendSuccessResponse({ res, data: { createSession } });
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

    const updatedSession = await updateQuery(sessionModel, { _id: sessionId }, { sessionEndTime: sessionTime, isSessionStart: false });
    const startTime = new Date(updatedSession.sessionStartTime);
    const endTime = new Date(updatedSession.sessionEndTime);

    // Calculate the duration in minutes
    const duration = (endTime - startTime) / (1000 * 60);

    // Assume session cost per minute
    const costPerminute = 100; // used manually just for test

    const saveObj = {
      sessionId: sessionId,
      userId: individualId,
      sessionDuration: duration,
      cost: duration * costPerminute, 
    }
    await createQuery(individualTransactionModel, saveObj);

    const updateChatDetails = await updateQuery(
      chatDetailsModel,
      { receiverId: therapistsId, chatType: 'message' },
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

const createReport = async(req, res) => {
  const user = await authCredtionalsModel.findOne({
    userId: req.body.userId,
    email: req.body.email
  });

  if(!user) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User not found!' },
    });
  }

  await reportModel.create({
    ...req.body,
    userType: user.userType
  });

  return SendSuccessResponse({ res, data: { data: 'Sent Successfully' } });
};

const createNotificationData = async(req, res) => {
  const { individualId, therapistsId } = req.body;
  let [receiverDetail] = await findQuery(userExtraDetailsModel, {
    userId: individualId,
  });
  if(!receiverDetail) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User not found!' },
    });
  } 
  const [individualData] = await findQuery(individualNotificationModel, { 
    $and: [
      { individualId },
      { therapistsIds: { $in: [therapistsId] } }
    ]
  });
  if(individualData) {
    await updateQuery(individualNotificationModel, {individualId}, {
      $pull: { therapistsIds: { $in: [therapistsId] }}
    })
    return SendSuccessResponse({ res, data: { data: false } });
  }

  const notificatioData = await individualNotificationModel.findOne({individualId});
  if(notificatioData) {
    await updateQuery(individualNotificationModel, { individualId }, {
      $push: {
        therapistsIds: therapistsId
      }
    })
  } else {
    await createQuery(individualNotificationModel, {
      individualId,
      fcmToken: receiverDetail.fcmToken,
      therapistsIds: [therapistsId],
      isNotify: true,
    })
  }
  
  return SendSuccessResponse({ res, data: { data: true } });
}

const sendNotificationToIndividual = async (therapistId) => {
  console.log('therapistId122', therapistId)
  const notificationData = await findQuery(individualNotificationModel, { therapistsIds: { $in: [ therapistId ] }});
  console.log('notificationData', notificationData);
  const therapistData =  await findQuery(therapistModel, { _id: therapistId });
  console.log('data12', therapistData);
    for(let notification of notificationData) {
      console.log('notification.individualId', notification.individualId);
      const [individualData] = await findQuery(userExtraDetailsModel, {userId: notification.individualId})
      console.log('individualData', individualData);
      if(individualData && individualData.fcmToken) {
        const message = {
            notification: {
              title: `${therapistData.name}`,
              body: `${therapistData.name} is online now`,
            },
            data: {
              senderId: therapistId,
              receiverId: notification.individualId,
              title: `${therapistData.name}`,
              body: `${therapistData.name} is online now`,
            },
            token: individualData.fcmToken, 
          };
        console.log('data122222', message);
        const notify = await admin.messaging().send(message);
        console.log('datat12', notify);
      }
  }
}

const getlistOfTherapistNotified = async(req, res) => {
  const { individualId } = req.query;
  const therapistData = await findQuery(individualNotificationModel, { individualId });
  if(!therapistData) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'no therapist notified' },
    });
  }
  
  return SendSuccessResponse({ res, data: { data:  therapistData} });
}

const getCalldata = (io) => async(req, res) => {
  console.log('12233333===>');
  console.log('req1222', req.body);
  // const { therapistsId, individualId } = req;
  
  // console.log('data12233333===>', therapistsId.toString());
  // const dataMapper = chatMapper(req.body);
//   await updateQuery(
//     chatDetailsModel,
//       { receiverId: therapistsId, chatType: "call"},
//       { $pull: { "individualDetails": { senderId: individualId} } },
//   );
//   const [data] = await findQuery(chatDetailsModel, {receiverId: therapistsId, chatType: 'call'})
//   console.log('data1266667766522 ==> ', data);
//   await createQuery(callDetailsModel, {...dataMapper, therapistsId, individualId});

//   io.to(therapistsId).emit('refresh-call-lists', {data: data.individualDetails});

//   return SendSuccessResponse({ res, data: { data:  'Received request successfully'} });
// }

// const chatMapper = (data) => {
//   return {
//     callerId: data.CallSid || null,
//     eventType: data.EventType || null,
//     startTime: data.StartTime || null,
//     endTime: data.EndTime || null,
//     status: data.Status || null,
//     from: data.From || null,
//     to: data.To || null,
//     phoneNumberSid: data.PhoneNumberSid || null,
//     direction: data.Direction || null,
//     recordingUrl: data.RecordingUrl || null,
//     conversationDuration: data.ConversationDuration || null,
//   //   legs: [{
//   //     userType: 'therapist',
//   //     onCallDuration: data?.Legs[0].OnCallDuration,
//   //     status: data.Legs[0].Status
//   //   },{
//   //     userType: 'individual',
//   //     onCallDuration: data?.Legs[1].OnCallDuration,
//   //     status: data.Legs[1].Status
//   //   }
//   // ]
//   }
}

module.exports = {
  GetImage,
  UploadImages,
  Logout,
  sentPushNotifications,
  chatHistory,
  getProfile,
  startSession,
  endSession,
  createReport,
  createNotificationData,
  sendNotificationToIndividual,
  getlistOfTherapistNotified,
  getCalldata,
};
