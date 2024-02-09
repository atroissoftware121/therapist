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
} = require('../controllers/commonController');
const { upload } = require('../helpers/s3Helper');

const {
  injectUserDetails,
  isAuthorized,
} = require('../middlewares/authMiddlewares');
const { Logout } = require('../controllers/commonController');

module.exports = (app, io) => {
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
      }),
    }),
    isAuthorized,
    sentPushNotifications(io),
  );
  route.get('/chatHistory', isAuthorized, injectUserDetails, chatHistory);
  route.get('/image/:key', GetImage);
  route.post('/image', upload.single('image'), UploadImages);
  route.get('/getProfile', isAuthorized, injectUserDetails, getProfile);
  route.get('/session-start', startSession(io));
  route.get('/end-session', endSession(io));
};
   