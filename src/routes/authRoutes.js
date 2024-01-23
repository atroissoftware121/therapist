const { Segments, Joi, celebrate } = require('celebrate');
const { Router } = require('express');

const {
  GetOtp,
  VerifyOtp,
  ForgetPassword,
  Login,
  Logout,
} = require('../controllers/authController');

module.exports = (app) => {
  const route = Router();
  app.use('/auth', route);

  route.get('/getOtp', GetOtp);

  route.get('/verifyOtp', VerifyOtp);

  route.post(
    '/login',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        email: Joi.string().required(),
        password: Joi.string().required(),
        userType: Joi.string().required(),
        fcmToken: Joi.string().required(),
        deviceInfo: Joi.string().required(),
      }),
    }),
    Login
  );
  route.post(
    '/forgetPassword',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        otp: Joi.string().required(),
        password: Joi.string().required(),
        mobileNumber: Joi.string().required(),
      }),
    }),
    ForgetPassword
  );
};
