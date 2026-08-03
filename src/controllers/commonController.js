const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const {
  findQuery,
  updateQuery,
  findQueryWithPagining,
  createQuery,
  deleteQuery,
} = require('../helpers/mongooseHelpers');
const mongoose = require('mongoose');
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
const adminNotificationModel = require('../mongooseModels/admin-notification.model');
const callDetailsModel = require('../mongooseModels/callChat-details.model');
const { refreshCallListsEvent, chatDetailsEvent, startTimerEvent, endTimerEvent, io } = require('../loaders/socket');
const reviewModel = require('../mongooseModels/review.model');
const notificationsModel = require('../mongooseModels/notifications.model');


const GetImage = async (req, res) => {
  const key = req.params.key;
  try {
    const readStream = getFileStream(key);

    readStream.on('error', (error) => {
      res.status(500).json({ error: error.message });
    });

    readStream.pipe(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
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
        lastLogout: new Date()
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
    if (receiverDetail) {
      console.log(receiverDetail.fcmToken);
      let response = 'individual added in queue';
      if (receiverDetail.fcmToken !== 'ios' || !receiverDetail.fcmToken) {
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
        try {
          response = await admin.messaging().send(message);
          console.log(response);
        } catch (fcmErr) {
          // Don't block socket delivery if FCM token is invalid
          console.error('FCM send failed:', fcmErr.message);
          response = 'fcm_failed_socket_only';
        }
      }
      console.log(response);

      // Individual → therapist: add to therapist queue + socket emit
      // Therapist → individual: still emit socket so receiver gets real-time event
      if (data.userType === 'individual') {
        const individualObj = {
          senderId: data.senderId,
          senderName: `${individualData.fname} ${individualData.lname}`,
          email: individualData.email,
          mobileNumber: individualData.mobileNumber,
          gender: individualData.gender,
          timing: data.chatDuration
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
      } else {
        // Therapist → individual: emit to individual's room
        const receiverRoom = String(data.receiverId);
        io.to(receiverRoom).emit('chat-details', {
          data: [{
            senderId: data.senderId,
            senderName: therapistsData.name,
            title: data.title,
            message: data.message,
            chatType: data.chatType,
          }],
          image: therapistsData.image,
        });
        console.log(`[pushNotification] emitted chat-details to individual room ${receiverRoom}`);
      }

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
  const { id } = req.query;

  if (!id) {
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'User ID is required!' },
    });
  }

  const fields =
    "isTherapistRegistrationStepFirst name image age mobileNumber email gender specialization charges qualification discountedCharges location language experience summary isOnline onCall isMessageQueue isCallQueue isProfileVerified isAdmin wallet review notification userExtraDetails documents createdAt updatedAt isInChat isWalletRestricted accountRestictionMessage isAccountRestricted wallletRestictionMessage";

  const therapist = await therapistModel.findById(id).select(fields);
  if (therapist) {
    return SendSuccessResponse({ 
      res, 
      data: { getProfileData: therapist } 
    });
  }

  const individual = await individualModel.findById(id).select(fields);
  if (individual) {
    return SendSuccessResponse({ 
      res, 
      data: { getProfileData: individual } 
    });
  }

  return SendBadResponse({
    res,
    status: 404,
    data: { error: 'User not found!' },
  });
};



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
      sessionDuration
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
      sessionDuration: sessionDuration,
      cost: (sessionDuration / 60) * charges,
    }
    const startTime = new Date(sessionData.sessionStartTime);
    const sessionEndTime = new Date(startTime.getTime() + sessionDuration * 1000);
    console.log('saveObj', saveObj);
    const adminConfig = await adminSettingModel.findOne({});
    console.log('adminConfig', adminConfig);
    const percentageCutoff = saveObj.cost - (saveObj.cost * (adminConfig.commissionPercentage / 100));
    await updateQuery(
      sessionModel,
      { _id: sessionId },
      {
        sessionEndTime: sessionEndTime,
        isSessionStart: false,
        sessionCost: saveObj.cost,
        therapistIncome: percentageCutoff,
        adminPercentage: adminConfig.commissionPercentage,
      }
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
        commission: adminConfig.commissionPercentage,
        // sessionEndTime:sessionEndTime,
        sessionDuration: saveObj.sessionDuration
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
};

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
};

const getCalldata = async (req, res) => {
  const { therapistsId, individualId } = req.query;
  console.log('12233333===>', therapistsId, individualId);
  await updateQuery(
    chatDetailsModel,
    { receiverId: therapistsId, chatType: "call" },
    { $pull: { "individualDetails": { senderId: individualId } } },
  );
  const [data] = await findQuery(chatDetailsModel, { receiverId: therapistsId, chatType: 'call' })
  console.log('dat12', data);
  const dataMapper = chatMapper(data);
  const therapisData = await findQuery(therapistModel, { _id: therapistsId });
  const costPerCall = therapisData.charges * (dataMapper.conversationDuration / 60);
  const adminConfig = await adminSettingModel.findOne({});
  console.log('adminConfig', adminConfig);
  const percentageCutoff = costPerCall - (costPerCall * (adminConfig.commissionPercentage / 100));
  await createQuery(callDetailsModel, {
    ...dataMapper,
    therapistsId,
    individualId,
    sessionCost: costPerCall,
    therapistIcome: percentageCutoff,
    adminPercentage: adminConfig.commissionPercentage,
    conversationDuration: dataMapper.conversationDuration / 60
  });
  await updateQuery(individualModel, { _id: individualId }, { $inc: { wallet: -costPerCall } })
  await refreshCallListsEvent(data, therapistsId);

  return SendSuccessResponse({ res, data: { data: 'Received request successfully' } });
}

const chatMapper = (data) => {
  return {
    callerId: data?.CallSid || null,
    eventType: data?.EventType || null,
    startTime: data?.StartTime || null,
    endTime: data?.EndTime || null,
    status: data?.Status || null,
    from: data?.From || null,
    to: data?.To || null,
    phoneNumberSid: data?.PhoneNumberSid || null,
    direction: data?.Direction || null,
    recordingUrl: data?.RecordingUrl || null,
    conversationDuration: data?.ConversationDuration || null,
    legs: [{
      userType: 'therapist',
      onCallDuration: data?.Legs[0]?.OnCallDuration,
      status: data?.Legs[0]?.Status
    }, {
      userType: 'individual',
      onCallDuration: data?.Legs[1]?.OnCallDuration,
      status: data?.Legs[1]?.Status
    }
    ]
  }
};
// const chatUserlist = async (req, res) => {
//   let { individualId, therapistsId, chatType, page } = req.query;
//   console.log('req.query', req.query);
//   let offset = 0;
//   let limit = 20;
//   let pushUserData;

//   if (page) {
//     offset = (page - 1) * limit;
//   }

//   const options = {
//     limit,
//     offset
//   };
//   const userId = individualId ? { individualId } : { therapistsId };

//   const userModel = individualId ? therapistModel : individualModel;
//   // if (chatType === 'message') {
//   //   const userMsgData = await findQueryWithPagining(sessionModel, { ...userId, isDeleted: false }, options);
//   //   pushUserData = await Promise.all(userMsgData.docs.map(async (data) => {
//   //     const timeDifference = new Date(data.sessionEndTime) - new Date(data.sessionStartTime);
//   //     const chatTiming = timeDifference / 1000;
//   //     const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
//   //     let messageData = await userModel.findOne({_id: id}).lean();
//   //     console.log('messageData', messageData);
//   //     if (individualId) {
//   //       const review = await reviewModel.findOne({ consultationId: data._id });
//   //       messageData = {
//   //         ...messageData,
//   //         review: {
//   //           rating: review?.rating,
//   //           comments: review?.comments
//   //         },
//   //       }
//   //     }
//   //     const obj = {
//   //       chatTiming,
//   //       sessionCost: data.sessionCost || 0,
//   //       consultationId: data._id,
//   //       isReview: data?.isReview,
//   //       ...messageData
//   //     };

//   //     return obj;
//   //   }));
//   // }
//   if (chatType === 'message') {
//     const userMsgData = await findQueryWithPagining(sessionModel, { ...userId, isDeleted: false }, options);
//     console.log('userMsgData', userMsgData);
//     const userIds = userMsgData.docs.map(data => individualId ? data.therapistsId : data.individualId);
//     const users = await userModel.find({ _id: { $in: userIds } }).lean();
//     const reviews = await reviewModel.find({ consultationId: { $in: userMsgData.docs.map(data => data._id) } }).lean();

//     const userMap = new Map(users.map(user => [user._id.toString(), user]));
//     const reviewMap = new Map(reviews.map(review => [review.consultationId.toString(), review]));

//     pushUserData = userMsgData.docs.map(data => {
//       const timeDifference = new Date(data.sessionEndTime) - new Date(data.sessionStartTime);
//       const chatTiming = timeDifference / 1000;

//       const userIdKey = individualId ? data.therapistsId : data.individualId;
//       let messageData = userMap.get(userIdKey.toString()) || {};

//       if (individualId) {
//         const review = reviewMap.get(data._id.toString());
//         messageData.review = {
//           rating: review?.rating,
//           comments: review?.comments
//         };
//       }
//       // console.log()
//       const upData =  {
//         chatTiming,
//         sessionCost: data.sessionCost || 0,
//         consultationId: data._id,
//         isReview: data?.isReview,
//         ...messageData
//       };

//       console.log('datatatat12', upData);

//       return upData;
//     });
//   }
//   else {
//     const individualCallData = await findQueryWithPagining(callDetailsModel, userId, options);
//     pushUserData = await Promise.all(individualCallData.docs.map(async (data) => {
//       const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
//       const userCallData = await findQuery(userModel, id);
//       const review = await reviewModel.findOne({ consultationId: data._id });
//       const obj = {
//         callTiming: data.conversationDuration,
//         sessionCost: ((data.conversationDuration) / 60) * userCallData?.charges || 0,
//         consultationId: data._id,
//         review: {
//           rating: review?.rating,
//           comments: review?.comments
//         },
//         isReview: data?.isReview,
//         sessionCost: 0,
//         ...userCallData.toObject(),
//       };

//       return obj;
//     }))
//   }
//   // else if (chatType === 'message12'){
//   //   const individualCallData = await findQueryWithPagining(callDetailsModel, userId, options);

//   //   const userIds = individualCallData.docs.map(data => individualId ? data.therapistsId : data.individualId);
//   //   const consultationIds = individualCallData.docs.map(data => data._id);

//   //   const users = await userModel.find({ _id: { $in: userIds } }).lean();
//   //   const reviews = await reviewModel.find({ consultationId: { $in: consultationIds } }).lean();

//   //   const userMap = new Map(users.map(user => [user._id.toString(), user]));
//   //   const reviewMap = new Map(reviews.map(review => [review.consultationId.toString(), review]));

//   //   pushUserData = individualCallData.docs.map(data => {
//   //     const userIdKey = individualId ? data.therapistsId : data.individualId;
//   //     const userCallData = userMap.get(userIdKey.toString()) || {};

//   //     const review = reviewMap.get(data._id.toString());
//   //     const callTiming = data.conversationDuration;
//   //     const sessionCost = (callTiming / 60) * (userCallData.charges || 0);

//   //     return {
//   //       callTiming,
//   //       sessionCost,
//   //       consultationId: data._id,
//   //       review: {
//   //         rating: review?.rating,
//   //         comments: review?.comments
//   //       },
//   //       isReview: data?.isReview,
//   //       ...userCallData
//   //     };
//   //   });
//   // }

//   console.log('pushUserData12', pushUserData);
//   return SendSuccessResponse({ res, data: { data: pushUserData, length: pushUserData.length } });
// }

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

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  if (chatType === 'message') {
    const userMsgData = await findQueryWithPagining(sessionModel, {
      ...userId,
      isDeleted: false,
      createdAt: { $gte: fortyEightHoursAgo }
    }, options);

    for (const data of userMsgData.docs) {
      console.log('data122', data);
      const timeDifference = new Date(data.sessionEndTime) - new Date(data.sessionStartTime);
      const chatTiming = timeDifference / 1000;
      const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
      const userMsg = await findQuery(userModel, id);
      const reviewData = await reviewModel.findOne({ consultationId: data._id, comment: data.comments });
      const obj = {
        ...userMsg?._doc,
        chatTiming,
        sessionCost: data.sessionCost || 0,
        consultationId: data._id,
        isReview: reviewData?.rating || false,
        comment: reviewData?.comments || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
      pushUserData.push(obj);
    }
  } else {
    const individualCallData = await findQueryWithPagining(callDetailsModel, {
      ...userId,
      createdAt: { $gte: fortyEightHoursAgo }
    }, options);

    for (const data of individualCallData.docs) {
      const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
      console.log('oid122222', id);
      const userCallData = await findQuery(userModel, id);
      console.log('userCallData', userCallData);
      const reviewData = await reviewModel.findOne({ consultationId: data._id, comment: data.comments });
      const obj = {
        ...userCallData?._doc,
        callTiming: data.conversationDuration,
        sessionCost: ((data.conversationDuration) / 60) * userCallData?.charges || 0,
        consultationId: data._id,
        isReview: reviewData?.rating,
        comment: reviewData?.comments,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt
      };
      pushUserData.push(obj);
    }
  }

  return SendSuccessResponse({ res, data: { data: pushUserData, length: pushUserData.length } });
};

const callUserlist = async (req, res) => {
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

  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const individualCallData = await findQueryWithPagining(callDetailsModel, {
    ...userId,
    createdAt: { $gte: fortyEightHoursAgo }
  }, options);

  console.log('individualCallData12', individualCallData);

  for (const data of individualCallData.docs) {
    const id = individualId ? { _id: data.therapistsId } : { _id: data.individualId };
    console.log('oid122222', id);
    const userCallData = await findQuery(userModel, id);
    console.log('userCallData', userCallData);
    const obj = {
      callTiming: data.conversationDuration,
      sessionCost: ((data.conversationDuration) / 60) * userCallData?.charges || 0,
      consultationId: data._id,
      isReview: data?.isReview,
      // status:data.status,
      // callerId:data.callerId,
      // from:data.from,
      // to:data.to,
      sessionCost: 0,
      ...userCallData?._doc,
    };
    pushUserData.push(obj);
  }

  return SendSuccessResponse({ res, data: { data: pushUserData, length: pushUserData.length } });
};

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
  console.log('userDat12', userData);
  const therapistIds = userData.map(data => data.therapistsId);
  const therapistMsgData = await therapistModel.find({ _id: { $in: therapistIds } });

  return SendSuccessResponse({ res, data: { data: therapistMsgData, length: therapistMsgData.length } });
};

const deleteChat = async (req, res) => {
  const { sessionId, chatType } = req.query;
  if (chatType === 'message') {
    await updateQuery(sessionModel, { _id: sessionId }, { isDeleted: true })
  }
  return SendSuccessResponse({ res, data: { data: "chat deleted successfully " } })

};

const fetchUserData = async (req, res) => {
  const { individualId, therapistId } = req.query;
  const individualData = await findQuery(individualId ? individualModel : therapistModel, { _id: individualId || therapistId })
  console.log('individualData', individualData);
  return SendSuccessResponse({ res, data: { data: individualData } })

};

const removeUser = async (req, res) => {
  console.log('req', req.query)
  const { individualId, therapistId } = req.query;
  const userData = await deleteQuery(individualId ? individualModel : therapistModel, { _id: individualId || therapistId })
  console.log('userData', userData);
  return SendSuccessResponse({ res, data: { data: userData } })

};


const fetchUserDataByEmail = async (req, res) => {
  const { email, individual } = req.query;
  const userData = await findQuery(individual ? individualModel : therapistModel, { email })
  console.log('individualData', userData);
  return SendSuccessResponse({ res, data: { data: userData } })
};

const fetchChatDetails = async (req, res) => {
  const { chatType, page, limit } = req.query;
  const options = {
    page,
    limit,
  };
  const populateOptions = ['individualId', 'therapistsId'];
  const queryModel = chatType === 'message' ? sessionModel : callDetailsModel;
  const userChatData = await queryModel.find().skip((page - 1) * limit).limit(limit).populate(populateOptions);

  return SendSuccessResponse({ res, data: { data: userChatData } })
};

const therapistAccountRestricted = catchAsync(async (req, res) => {
  let { _id, message, accountRestriction } = req.body;
  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Permission Denied");
  }

  const [userData] = await findQuery(userExtraDetailsModel, {
    userId: _id,
  });
  console.log('userData', userData);
  const userModel = userData.userType === 'therapists' ? therapistModel : individualModel;
  let user = await findQuery(userModel, { _id });
  if (!user) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "user Not Found!" },
    });
  }
  const response = await updateQuery(
    userModel,
    { _id },
    { isAccountRestricted: accountRestriction, accountRestictionMessage: message }
  );

  return SendSuccessResponse({
    res,
    data: {
      message: accountRestriction ? `therapist account restricted successFully!` : `therapist account unrestricted successfully!`,
      data: response
    },
  });
});

// const notificationBroadCast = async (req, res) => {
//   // const token = 'dA-_SeovSaGD5Nch-eH7rW:APA91bGsvNVtEhm2EPSZUhKxD4MTxlKsGNZ4dkY0OGSjDkt6sHffCEzguMnWvUH2sQagrBDHL3lr3wELncI00W0kQJc_8aOR2dspQBghSq8oZ_4_Hxe237E';
//   // const topic = 'all-users'; // Specify the topic here
//   // try {
//   //     await admin.messaging().subscribeToTopic(token, topic);
//   //     console.log(`Successfully subscribed to topic: ${topic}`);
//   //   } catch (error) {
//   //     console.error(`Error subscribing to topic: ${topic}`, error);
//   //   }
//   const message = {
//     notification: {
//       title: req.body.title,
//       body: req.body.message,
//     },
//     topic: 'all-users', // Specify the topic here
//   };
//   const response = await admin.messaging().send(message);
//   console.log('response12', response);
//   // const notification = await adminNotificationModel.create(req.body);
//   return SendSuccessResponse({ res, data: response });
// };

const notificationBroadCast = async (req, res) => {
  const { users } = req.body;
  const topics = users === 'both' ? 'all-users' : users === 'therapist' ? 'therapist-subscribed' : 'individual-subscribed';
  const message = {
    notification: {
      title: req.body.title,
      body: req.body.message,
    },
    topic: topics,
  };
  const response = await admin.messaging().send(message);
  const notification = await adminNotificationModel.create(req.body);

  switch (users) {
    case 'both':
      await notificationsModel.updateMany({ $push: { notifications: { title: req.body.title, message: req.body.message } } })
      break;
    case 'therapist':
      await notificationsModel.findOneAndUpdate({ userType: users }, { $push: { notifications: { title: req.body.title, message: req.body.message } } })
      break;
    case 'individual':
      await notificationsModel.findOneAndUpdate({ userType: users }, { $push: { notifications: { title: req.body.title, message: req.body.message } } })
      break;
  };
  return SendSuccessResponse({ res, data: { data: notification } });
};

const fetchNotificationList = async (req, res) => {
  const notificationListDetails = await notificationsModel.findOne({ userId: req.query.userId }).populate('userId');
  return SendSuccessResponse({ res, data: { data: notificationListDetails } });
};


const getTopRecentTherapists = async (req, res) => {
  try {
    const {individualId, limit = 5, days = 7, chatType = 'all' } = req.query;
 
    if (!mongoose.Types.ObjectId.isValid(individualId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid individual ID'
      });
    }
 
    const dateFilter = new Date();
    dateFilter.setDate(dateFilter.getDate() - parseInt(days));
 
    const matchConditions = {
      individualId: new mongoose.Types.ObjectId(individualId),
      isDeleted: false,
      sessionStartTime: { $gte: dateFilter }
    };
 
    if (chatType !== 'all') {
      matchConditions.chatType = chatType;
    }
 
    const result = await sessionModel.aggregate([
      {
        $match: matchConditions
      },
      {
        $sort: { sessionStartTime: -1 }
      },
      {
        $group: {
          _id: '$therapistsId', // Fixed: was *id
          lastContact: { $first: '$sessionStartTime' },
          lastSessionType: { $first: '$chatType' }
        }
      },
      {
        $lookup: {
          from: 'therapists',
          localField: '_id', // Fixed: was *id
          foreignField: '_id',
          as: 'therapist'
        }
      },
      {
        $unwind: '$therapist'
      },
      {
        $project: {
          therapistId: '$_id',
          therapist: 1, 
          lastContact: 1,
          lastSessionType: 1
        }
      },
      
      {
        $sort: { lastContact: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
 
    const therapistsWithTimeAgo = result.map(therapist => ({
      ...therapist,
      timeAgo: getTimeAgo1(therapist.lastContact)
    }));
 
    res.status(200).json({
      success: true,
      data: therapistsWithTimeAgo,
      meta: {
        count: therapistsWithTimeAgo.length,
        period: `${days} days`,
        chatType
      }
    });
 
  } catch (error) {
    console.error('Error fetching top recent therapists:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top recent therapists',
      error: error.message
    });
  }
};
 
const getTimeAgo1 = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
};





// const getCallStatus = async (req, res) => {
//   try {
//     const {
//       page = 1,
//       limit = 10,
//      status,
//      direction,
//      days = 30,
//      startDate,
//      endDate,
//      userId,
//      userType
//    } = req.query;
//    // Validation
//    if (!mongoose.Types.ObjectId.isValid(userId)) {
//      return res.status(400).json({
//        success: false,
//        message: 'Invalid user ID'
//      });
//    }
//    if (!['individual', 'therapist'].includes(userType)) {
//      return res.status(400).json({
//        success: false,
//        message: 'User type must be either "individual" or "therapist"'
//      });
//    }
//    // Build match conditions
//    const matchConditions = {};
//    // Set user filter based on type
//    if (userType === 'individual') {
//      matchConditions.individualId = new mongoose.Types.ObjectId(userId);
//    } else {
//      matchConditions.therapistsId = new mongoose.Types.ObjectId(userId);
//    }
//    // Date filtering
//    if (startDate && endDate) {
//      matchConditions.startTime = {
//        $gte: new Date(startDate),
//        $lte: new Date(endDate)
//      };
//    } else if (days) {
//      const dateFilter = new Date();
//      dateFilter.setDate(dateFilter.getDate() - parseInt(days));
//      matchConditions.startTime = { $gte: dateFilter };
//    }
//    // Status filter
//    if (status) {
//      matchConditions.status = status;
//    }
//    // Direction filter
//    if (direction) {
//      matchConditions.direction = direction;
//    }
//    // Pagination options
//    const options = {
//      page: parseInt(page),
//      limit: parseInt(limit),
//      sort: { startTime: -1 }, // Most recent first
//      populate: [
//        {
//          path: 'individualId',
//          select: 'name email phone'
//        },
//        {
//          path: 'therapistsId',
//          select: 'name email phone specialty'
//        }
//      ],
//      customLabels: {
//        docs: 'calls',
//        totalDocs: 'totalCount'
//      }
//    };
//    const result = await callDetailsModel.paginate(matchConditions, options);
//    // Format the response
//    const formattedCalls = result.calls.map(call => ({
//      callId: call._id,
//      callerId: call.callerId,
//      individual: call.individualId ? {
//        id: call.individualId._id,
//        name: call.individualId.name,
//        email: call.individualId.email,
//        phone: call.individualId.phone
//      } : null,
//      therapist: call.therapistsId ? {
//        id: call.therapistsId._id,
//        name: call.therapistsId.name,
//        email: call.therapistsId.email,
//        phone: call.therapistsId.phone,
//        specialty: call.therapistsId.specialty
//      } : null,
//      callDetails: {
//        status: call.status,
//        eventType: call.eventType,
//        direction: call.direction,
//        from: call.from,
//        to: call.to,
//        startTime: call.startTime,
//        endTime: call.endTime,
//        durationMinutes: Math.round(call.conversationDuration / 60),
//        durationSeconds: call.conversationDuration,
//        recordingUrl: call.recordingUrl
//      },
//      billing: {
//        sessionCost: call.sessionCost,
//        therapistIncome: call.therapistIncome,
//        adminPercentage: call.adminPercentage
//      },
//      legs: call.legs,
//      timeAgo: getTimeAgo(call.startTime),
//      createdAt: call.createdAt
//    }));
//    res.status(200).json({
//      success: true,
//      data: {
//        calls: formattedCalls,
//        pagination: {
//          currentPage: result.page,
//          totalPages: result.totalPages,
//          totalCount: result.totalCount,
//          hasNext: result.hasNextPage,
//          hasPrev: result.hasPrevPage,
//          limit: result.limit
//        }
//      },
//      filters: {
//        userId,
//        userType,
//        status,
//        direction,
//        days: days ? parseInt(days) : null,
//        dateRange: startDate && endDate ? { startDate, endDate } : null
//      }
//    });
//  } catch (error) {
//    console.error('Error fetching call status:', error);
//    res.status(500).json({
//      success: false,
//      message: 'Failed to fetch call status',
//      error: error.message
//    });
//  }
// };
// /**
// * Get call status summary/statistics
// */
// const getCallStatusSummary = async (req, res) => {
//  try {
//    const { userId, userType } = req.params;
//    const { days = 30 } = req.query;
//    // Validation
//    if (!mongoose.Types.ObjectId.isValid(userId)) {
//      return res.status(400).json({
//        success: false,
//        message: 'Invalid user ID'
//      });
//    }
//    if (!['individual', 'therapist'].includes(userType)) {
//      return res.status(400).json({
//        success: false,
//        message: 'User type must be either "individual" or "therapist"'
//      });
//    }
//    // Build match conditions
//    const matchConditions = {};
//    if (userType === 'individual') {
//      matchConditions.individualId = new mongoose.Types.ObjectId(userId);
//    } else {
//      matchConditions.therapistsId = new mongoose.Types.ObjectId(userId);
//    }
//    // Date filter
//    const dateFilter = new Date();
//    dateFilter.setDate(dateFilter.getDate() - parseInt(days));
//    matchConditions.startTime = { $gte: dateFilter };
//    const summary = await CallDetails.aggregate([
//      { $match: matchConditions },
//      {
//        $group: {
//          _id: null,
//          totalCalls: { $sum: 1 },
//          completedCalls: {
//            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
//          },
//          missedCalls: {
//            $sum: { $cond: [{ $eq: ['$status', 'missed'] }, 1, 0] }
//          },
//          failedCalls: {
//            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
//          },
//          incomingCalls: {
//            $sum: { $cond: [{ $eq: ['$direction', 'incoming'] }, 1, 0] }
//          },
//          outgoingCalls: {
//            $sum: { $cond: [{ $eq: ['$direction', 'outgoing'] }, 1, 0] }
//          },
//          totalDurationMinutes: {
//            $sum: { $divide: ['$conversationDuration', 60] }
//          },
//          totalCost: { $sum: '$sessionCost' },
//          avgCallDuration: {
//            $avg: { $divide: ['$conversationDuration', 60] }
//          }
//        }
//      },
//      {
//        $project: {
//          _id: 0,
//          totalCalls: 1,
//          completedCalls: 1,
//          missedCalls: 1,
//          failedCalls: 1,
//          incomingCalls: 1,
//          outgoingCalls: 1,
//          totalDurationMinutes: { $round: ['$totalDurationMinutes', 1] },
//          avgCallDurationMinutes: { $round: ['$avgCallDuration', 1] },
//          totalCost: { $round: ['$totalCost', 2] },
//          successRate: {
//            $round: [
//              { $multiply: [{ $divide: ['$completedCalls', '$totalCalls'] }, 100] },
//              1
//            ]
//          }
//        }
//      }
//    ]);
//    const stats = summary[0] || {
//      totalCalls: 0,
//      completedCalls: 0,
//      missedCalls: 0,
//      failedCalls: 0,
//      incomingCalls: 0,
//      outgoingCalls: 0,
//      totalDurationMinutes: 0,
//      avgCallDurationMinutes: 0,
//      totalCost: 0,
//      successRate: 0
//    };
//    res.status(200).json({
//      success: true,
//      data: stats,
//      meta: {
//        userId,
//        userType,
//        period: `${days} days`,
//        generatedAt: new Date().toISOString()
//      }
//    });
//  } catch (error) {
//    console.error('Error fetching call summary:', error);
//    res.status(500).json({
//      success: false,
//      message: 'Failed to fetch call summary',
//      error: error.message
//    });
//  }
// };
// /**
// * Get live/recent call status (for real-time updates)
// */
// const getLiveCallStatus = async (req, res) => {
//  try {
//    const { userId, userType } = req.params;
//    const { limit = 5 } = req.query;
//    // Validation
//    if (!mongoose.Types.ObjectId.isValid(userId)) {
//      return res.status(400).json({
//        success: false,
//        message: 'Invalid user ID'
//      });
//    }
//    // Get calls from last 24 hours
//    const yesterday = new Date();
//    yesterday.setDate(yesterday.getDate() - 1);
//    const matchConditions = {
//      startTime: { $gte: yesterday }
//    };
//    if (userType === 'individual') {
//      matchConditions.individualId = new mongoose.Types.ObjectId(userId);
//    } else {
//      matchConditions.therapistsId = new mongoose.Types.ObjectId(userId);
//    }
//    const recentCalls = await CallDetails.find(matchConditions)
//      .populate('individualId', 'name phone')
//      .populate('therapistsId', 'name phone')
//      .sort({ startTime: -1 })
//      .limit(parseInt(limit))
//      .select('status direction startTime endTime conversationDuration from to')
//      .lean();
//    const formattedCalls = recentCalls.map(call => ({
//      callId: call._id,
//      status: call.status,
//      direction: call.direction,
//      from: call.from,
//      to: call.to,
//      startTime: call.startTime,
//      endTime: call.endTime,
//      durationMinutes: Math.round(call.conversationDuration / 60),
//      timeAgo: getTimeAgo(call.startTime),
//      participant: userType === 'individual' ?
//        (call.therapistsId ? call.therapistsId.name : 'Unknown') :
//        (call.individualId ? call.individualId.name : 'Unknown')
//    }));
//    res.status(200).json({
//      success: true,
//      data: formattedCalls,
//      meta: {
//        count: formattedCalls.length,
//        period: '24 hours',
//        userType
//      }
//    });
//  } catch (error) {
//    console.error('Error fetching live call status:', error);
//    res.status(500).json({
//      success: false,
//      message: 'Failed to fetch live call status',
//      error: error.message
//    });
//  }
// };
// /**
// * Helper function to calculate time ago
// */
// const getTimeAgo = (date) => {
//  const now = new Date();
//  const diffInSeconds = Math.floor((now - date) / 1000);
 
//  if (diffInSeconds < 60) return 'Just now';
//  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
//  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
//  return `${Math.floor(diffInSeconds / 86400)} days ago`;
// };


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
  callUserlist,
  fetchUserData,
  removeUser,
  fetchUserDataByEmail,
  fetchChatDetails,
  therapistAccountRestricted,
  notificationBroadCast,
  fetchNotificationList,
  getTopRecentTherapists,
  getTimeAgo1,
  // getCallStatus,
  // getCallStatusSummary,
  // getLiveCallStatus,
  // getTimeAgo

};
