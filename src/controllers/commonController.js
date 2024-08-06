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

const { admin } = require('../config/messaging-system');
const catchAsync = require('../utils/catchAsync');
const pick = require('../utils/pick');
const { getFileStream, uploadFileS3 } = require('../helpers/s3Helper');
const adminSettingModel = require('../mongooseModels/admin-setting.model');
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
const { refreshCallListsEvent, chatDetailsEvent, startTimerEvent, endTimerEvent } = require('../loaders/socket');


const GetImage = async (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
};

const UploadImages = async (req, res) => {
  const file = req.file;
  console.log('file122', file);
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
  try {
    const data = req.body;
    let [receiverDetail] = await findQuery(userExtraDetailsModel, {
      userId: data.receiverId,
    });
    const individualId = data.userType === 'individual' ? data.senderId : data.receiverId;
    const therapistsId = data.userType === 'therapists' ? data.senderId : data.receiverId;
    const individualData = await findQuery(individualModel, { _id: individualId });
    const therapistsData = await findQuery(therapistModel, { _id: therapistsId });

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
          senderName: data.userType === 'individual' ? `${individualData.fname} ${individualData.lname}` : therapistsData.name,
          receiverId: data.receiverId,
          receiverName: data.userType === 'individual' ? therapistsData.name : `${individualData.fname} ${individualData.lname}`,
          title: data.title,
          body: data.message,
        },
        token: receiverDetail.fcmToken,
      };
      let response;
      if (data.userType === 'therapists') {
        response = await admin.messaging().send(message);
        console.log(response)
        return SendSuccessResponse({ res, data: response });
      }
      response = await admin.messaging().send(message);
      console.log(response)
      const individualObj = {
        senderId: data.senderId,
        senderName: `${individualData.fname} ${individualData.lname}`,
        email: individualData.email,
        mobileNumber: individualData.mobileNumber,
        gender: individualData.gender,
      };
      const [isChatExisted] = await findQuery(chatDetailsModel, { receiverId: data.receiverId, chatType: data.chatType });
      let messageData;
      if (isChatExisted) {
        const isSenderPresent = isChatExisted.individualDetails.some(detail => detail.senderId === data.senderId);
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


      messageData.individualDetails.forEach((item) => {
        if (item.senderId === data.senderId) {
          console.log('chatDuration12', data.chatDuration);
          item.timing = data.chatDuration;
        }
      });
      await chatDetailsEvent(data, messageData, individualData);

      return SendSuccessResponse({ res, data: response })
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

const startSession = async (req, res) => {
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
  const createSession = await createQuery(sessionModel, { sessionStartTime, individualId, therapistsId, isSessionStart: true });
  const data = {
    individualId,
    therapistsId,
    chatType: 'message',
    isSessionStart: createSession.isSessionStart,
    sessionId: createSession._id,
    startSession: sessionStartTime,
  };

  await startTimerEvent(data);
  await updateQuery(therapistModel, { _id: therapistsId }, { isInChat: true })
  const adminConfig = await adminSettingModel.findOne({});
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

  return SendSuccessResponse({ res, data: { createSession, adminCharge: adminConfig.commissionPercentage } });
};

const endSession = async (req, res) => {
  try {
    const { individualId, therapistsId, sessionId, charges, sessionDuration } = req.query;
    const data = {
      individualId,
      therapistsId,
      sessionId,
      isSessionStart: false,
    };
    await endTimerEvent(data);
    const sessionData = await findQuery(sessionModel, { _id: sessionId });

    if (!sessionData) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'session not found!' },
      });
    }
    const saveObj = {
      sessionId: sessionId,
      userId: individualId,
      sessionDuration: sessionDuration / 60,
      cost: (sessionDuration / 60) * charges,
    }
    const startTime = new Date(sessionData.sessionStartTime);
    const endTime = new Date(startTime.getTime() + sessionDuration * 1000);
    console.log('saveObj', saveObj);
    await updateQuery(
      sessionModel,
      { _id: sessionId },
      { sessionEndTime: endTime, isSessionStart: false, sessionCost: saveObj.cost }
    );

    await createQuery(individualTransactionModel, saveObj);
    await individualModel.updateOne(
      { _id: individualId },
      [
        {
          $set: {
            wallet: {
              $cond: [
                { $gte: ["$wallet", saveObj.cost] },
                { $subtract: ["$wallet", saveObj.cost] },
                0 // Set wallet to 0 if saveObj.cost is greater than the wallet balance
              ]
            }
          }
        }
      ]
    );
    
    const adminConfig = await adminSettingModel.findOne({});
    console.log('adminConfig', adminConfig);
    const percentageCutoff = saveObj.cost - (saveObj.cost * (adminConfig.commissionPercentage / 100));
    console.log('percentageCutoff', percentageCutoff);
    await updateQuery(therapistModel, { _id: therapistsId }, { $inc: { wallet: percentageCutoff }, isInChat: false });
    const updateChatDetails = await updateQuery(
      chatDetailsModel,
      { receiverId: therapistsId, chatType: 'message' },
      { $pull: { "individualDetails": { senderId: individualId, sessionId: sessionId } } },
    );

    return SendSuccessResponse({
      res, data: {
        updateChatDetails,
        costOfSession: saveObj.cost,
        therapistCostCutOff: percentageCutoff,
        commission: adminConfig.commissionPercentage
      }
    });
  } catch (err) {
    return SendBadResponse({
      res,
      status: 403,
      data: { message: err.message },
    });
  }
};

const createReport = async (req, res) => {
  const user = await authCredtionalsModel.findOne({
    userId: req.body.userId,
    email: req.body.email
  });

  if (!user) {
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

const report = async (req, res) => {
  const { message, email } = req.body;
  const user = await individualModel.findOne({ email })
  if (!user) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User not found! ' },
    });
  }
  await reportModel.create({
    ...req.body,
    description: message
  })
  return SendSuccessResponse({ res, data: { data: 'Sent Successfully' } });
}

const createNotificationData = async (req, res) => {
  const { individualId, therapistsId } = req.body;
  let [receiverDetail] = await findQuery(userExtraDetailsModel, {
    userId: individualId,
  });
  if (!receiverDetail) {
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
  if (individualData) {
    await updateQuery(individualNotificationModel, { individualId }, {
      $pull: { therapistsIds: { $in: [therapistsId] } }
    })
    return SendSuccessResponse({ res, data: { data: false } });
  }

  const notificatioData = await individualNotificationModel.findOne({ individualId });
  if (notificatioData) {
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

const getlistOfTherapistNotified = async (req, res) => {
  const { individualId } = req.query;
  const therapistData = await findQuery(individualNotificationModel, { individualId });
  if (!therapistData) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'no therapist notified' },
    });
  }

  return SendSuccessResponse({ res, data: { data: therapistData } });
}

const getCalldata = async (req, res) => {
  const { therapistsId, individualId } = req.query;
  const dataMapper = chatMapper(req.body);
  console.log('12233333===>', therapistsId, individualId);
  await updateQuery(
    chatDetailsModel,
    { receiverId: therapistsId, chatType: "call" },
    { $pull: { "individualDetails": { senderId: individualId } } },
  );
  const [data] = await findQuery(chatDetailsModel, { receiverId: therapistsId, chatType: 'call' })
  await createQuery(callDetailsModel, { ...dataMapper, therapistsId, individualId });
  const therapisData = await findQuery(therapistModel, { _id: therapistsId });
  const costPerCall = therapisData.charges * (dataMapper.conversationDuration / 60);
  await updateQuery(individualModel, { _id: individualId }, { $inc: { wallet: -costPerCall } })
  await refreshCallListsEvent(data, therapistsId);

  return SendSuccessResponse({ res, data: { data: 'Received request successfully' } });
}

const chatMapper = (data) => {
  return {
    callerId: data.CallSid || null,
    eventType: data.EventType || null,
    startTime: data.StartTime || null,
    endTime: data.EndTime || null,
    status: data.Status || null,
    from: data.From || null,
    to: data.To || null,
    phoneNumberSid: data.PhoneNumberSid || null,
    direction: data.Direction || null,
    recordingUrl: data.RecordingUrl || null,
    conversationDuration: data.ConversationDuration || null,
    legs: [{
      userType: 'therapist',
      onCallDuration: data?.Legs[0].OnCallDuration,
      status: data.Legs[0].Status
    }, {
      userType: 'individual',
      onCallDuration: data?.Legs[1].OnCallDuration,
      status: data.Legs[1].Status
    }
    ]
  }
}

const chatUserlist = async (req, res) => {
  let { individualId, therapistsId, chatType, page } = req.query;

  let offset = 0;
  let limit = 20;
  const pushUserData = [];

  if (page) {
    offset = (page - 1) * limit;
  }

  const options = {
    limit,
    offset
  };
  const userId = individualId ? { individualId } : { therapistsId };

  const userModel = individualId ? therapistModel : individualModel;
  if (chatType === 'message') {
    const userMsgData = await findQueryWithPagining(sessionModel, { ...userId, isDeleted: false }, options);
    for (const data of userMsgData.docs) {
      console.log('data122', data);
      const timeDifference = new Date(data.sessionEndTime) - new Date(data.sessionStartTime);
      const chatTiming = timeDifference / 1000;
      const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
      const userMsgData = await findQuery(userModel, id);
      const obj = {
        chatTiming,
        sessionCost: data.sessionCost || 0,
        consultationId: data._id,
        isReview: data?.isReview,
        ...userMsgData?._doc,
      };
      pushUserData.push(obj);
    }
  }
  else {
    const individualCallData = await findQueryWithPagining(callDetailsModel, userId, options);
    for (const data of individualCallData.docs) {
      const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
      const userCallData = await findQuery(userModel, id);
      const obj = {
        callTiming: data.conversationDuration,
        sessionCost: ((data.conversationDuration) / 60) * userCallData?.charges || 0,
        consultationId: data._id,
        isReview: data?.isReview,
        sessionCost: 0,
        ...userCallData?._doc,
      };

      pushUserData.push(obj)
    }
  }

  return SendSuccessResponse({ res, data: { data: pushUserData, length: pushUserData.length } });
}

const therapistChatList = async (req, res) => {
  const { individualId, page } = req.query;

  let offset = 0;
  let limit = 20;
  if (page) {
    offset = (page - 1) * limit;
  };

  const pipeline = [
    {
      $match: {
        individualId,
        isDeleted: false
      }
    },
    {
      $unionWith: {
        coll: "calldetails",
        pipeline: [
          {
            $match: {
              individualId,
            }
          }
        ]
      }
    },
    {
      $group: {
        _id: "$therapistsId",
        doc: { $first: "$$ROOT" }
      }
    },
    {
      $replaceRoot: { newRoot: "$doc" }
    },
    {
      $skip: offset
    },
    {
      $limit: limit
    }
  ];
  const userData = await sessionModel.aggregate(pipeline);
  const therapistIds = userData.map(data => data.therapistsId);
  const therapistMsgData = await therapistModel.find({ _id: { $in: therapistIds } });
  const pushUserData = userData.map(data => {
    const therapist = therapistMsgData.find(therapist => therapist._id.equals(data.therapistsId));
    return therapist || data;
  });

  return SendSuccessResponse({ res, data: { data: pushUserData, length: pushUserData.length } });
}

const deleteChat = async (req, res) => {
  const { sessionId, chatType } = req.query;
  if (chatType === 'message') {
    await updateQuery(sessionModel, { _id: sessionId }, { isDeleted: true })
  }
  return SendSuccessResponse({ res, data: { data: "chat deleted successfully " } })

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
  report,
  createNotificationData,
  getlistOfTherapistNotified,
  getCalldata,
  chatUserlist,
  therapistChatList,
  deleteChat,
};
