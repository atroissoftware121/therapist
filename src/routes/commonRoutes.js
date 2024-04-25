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
  createNotificationData,
  getlistOfTherapistNotified,
  getCalldata,
  chatUserlist,
  therapistChatList,
  deleteChat,
} = require('../controllers/commonController');
const { upload } = require('../helpers/s3Helper');

const {
  injectUserDetails,
  isAuthorized,
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
    isAuthorized,
    sentPushNotifications,
  );
  route.get('/chatHistory', isAuthorized, injectUserDetails, chatHistory);
  route.get('/image/:key', GetImage);
  route.post('/image', upload.single('image'), UploadImages);
  route.get('/getProfile', isAuthorized, injectUserDetails, getProfile);
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
  route.post('/addIndividualNotification', createNotificationData);
  route.get('/getlistOfTherapistNotified', getlistOfTherapistNotified);
  route.post('/get-call-details', getCalldata);
  route.get('/fetchingChatUserlist', chatUserlist);
  route.get('/therapistChatList', therapistChatList);
  route.delete('/deleteChat',deleteChat);
};
