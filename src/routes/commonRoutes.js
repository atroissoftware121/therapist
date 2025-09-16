const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const {
  GetImage,
  UploadImages,
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
  callUserlist,
  therapistChatList,
  deleteChat,
  fetchUserData,
  removeUser,
  fetchUserDataByEmail,
  fetchChatDetails,
  therapistAccountRestricted,
  notificationBroadCast,
  fetchNotificationList,
  getTopRecentTherapists
} = require('../controllers/commonController');
const { upload } = require('../helpers/s3Helper');

const {
  injectUserDetails,
  isAuthorized,
  injectTherapistDetails
} = require('../middlewares/authMiddlewares');
const { Logout } = require('../controllers/commonController');

module.exports = (app) => {
  const route = Router();
  app.use('/', route);
  route.patch('/logout', isAuthorized, injectUserDetails, Logout);
  route.post(
    '/pushNotification',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        senderId: Joi.string().required(),
        receiverId: Joi.string().required(),
        title: Joi.string().required(),
        image: Joi.string().optional(),
        message: Joi.string().optional(),
        userType: Joi.string().required(),
        chatType: Joi.string().required(),
        chatDuration: Joi.number().optional(),
      }),
    }),
    // isAuthorized,
    sentPushNotifications,
  );
  route.get('/chatHistory', isAuthorized, injectUserDetails, chatHistory);
  route.get('/image/:key', GetImage);
  route.post('/image', upload.single('image'), celebrate({
    [Segments.BODY]: Joi.object().keys({
      senderId: Joi.string().optional(),
      receiverId: Joi.string().optional(),
    }),
  }), UploadImages);
  route.get('/getProfile', getProfile);
  route.get('/session-start', startSession);
  route.get('/end-session', endSession);
  route.post('/createReport', celebrate({
    [Segments.BODY]: Joi.object().keys({
      userId: Joi.string().required(),
      email: Joi.string().required(),
      description: Joi.string().required(),
    }),
  }),
    createReport
  );
  route.post('/report', celebrate({
    [Segments.BODY]: Joi.object().keys({
      message: Joi.string().required(),
      email: Joi.string().required(),
    }),
  }),
    report
  )
  route.post('/addIndividualNotification', createNotificationData);
  route.get('/getlistOfTherapistNotified', getlistOfTherapistNotified);
  route.get('/get-call-details', getCalldata);

  route.get('/fetchingChatUserlist',
    // celebrate({
    //   [Segments.QUERY]: Joi.object().keys({
    //     individualId: Joi.string().optional(),
    //     therapistsId: Joi.string().optional(),
    //     page: Joi.string().required(),
    //     chatType: Joi.string().required()
    //   }),
    // }),
    chatUserlist
  );

  route.get('/fetchingCallUserlist',
    callUserlist
  );

  route.get('/therapistChatList',
    celebrate({
      [Segments.QUERY]: Joi.object().keys({
        individualId: Joi.string().required(),
        page: Joi.string().required(),
      }),
    }),
    therapistChatList
  );
  route.delete('/deleteChat', deleteChat);
  route.get('/fetchUserData', fetchUserData);
  route.delete('/removeUser', removeUser);
  route.get('/fetchUserByEmail', fetchUserDataByEmail);
  route.get('/fetchChatData', fetchChatDetails);
  route.put('/therapistAccountRestricted', isAuthorized,
    injectTherapistDetails,
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        _id: Joi.string().required(),
        message: Joi.string().required(),
        accountRestriction: Joi.boolean().required()
      }),
    }), therapistAccountRestricted);
  route.post('/notifications/broadcast', notificationBroadCast);
  route.get('/fetchNotificationList', fetchNotificationList);
  route.get('/getTopRecentTherapists',getTopRecentTherapists);
};
