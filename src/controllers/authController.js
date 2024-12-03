const {
  findQuery,
  updateQuery,
  createQuery,
  deleteQuery,
  findOneQuery,
} = require('../helpers/mongooseHelpers');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const { sendSMS, genrateOtp } = require('../helpers/twilloHelpers');
const authCredtionalsModel = require('../mongooseModels/authCredtionals.model');
const otpSentModel = require('../mongooseModels/otpSent.model');
const therapistModel = require('../mongooseModels/therapist.model');
const individualModel = require('../mongooseModels/individual.model');
const notificationsModel = require('../mongooseModels/notifications.model');
const { getSignupOtpString } = require('../stringTemplates');
const { admin } = require('../config/messaging-system');
const { genrateToken } = require('../helpers/jwtHelpers');
const {
  genratePasswordHash,
  comparePassword,
} = require('../helpers/bcryptHelper');
const userExtraDetailsModel = require('../mongooseModels/userExtraDetails.model');

const GetOtp = async (req, res) => {
  let { n: mobileNumber, t: userType, m: method } = req.query;
  if (!mobileNumber || !method)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Please send all required fields!' },
    });
  if (method !== 'login' && method !== 'signup' && method !== 'forgetPassword')
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Please send correct method!' },
    });
  // if (userType !== 'therapist' && userType !== 'individual')
  //   return SendBadResponse({
  //     res,
  //     status: 400,
  //     data: { error: 'Please send correct usertype!' },
  //   });
  mobileNumber = '+' + mobileNumber.trim();
  let [isMobileNumberExist] = await findQuery(authCredtionalsModel, {
    mobileNumber,
  });
  // let [isNumberExistWithUsertype] = await findQuery(authCredtionalsModel, {
  //   $and: [{ mobileNumber }, { userType }],
  // });

  if (
    (method === 'login' || method === 'forgetPassword') &&
    !isMobileNumberExist
  )
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User not found!' },
    });

  if (method === 'signup' && isMobileNumberExist)
    return SendBadResponse({
      res,
      status: 404,
      data: { error: 'User number already in use, please proceed by loging in.' },
    });

  const [isOtpDataExist] = await findQuery(otpSentModel, {
    mobileNumber,
  });
  const alreadyOtpSent = isOtpDataExist?.sendTimes || 0;
  if (
    alreadyOtpSent === 3 &&
    new Date().getTime() <
    new Date(isOtpDataExist?.lastOtpSentTime).getTime() + 24 * 60 * 60 * 1000
  )
    return SendBadResponse({
      res,
      status: 502,
      data: { error: 'limit exceeded! Please try after one day.' },
    });

  //let otp = genrateOtp();
  let otp = '121';
  // let messageResponse = await sendSMS({
  //   to: mobileNumber,
  //   body: getSignupOtpString(otp),
  // });
  // if (!messageResponse)
  //   return SendBadResponse({
  //     res,
  //     status: 503,
  //     data: { error: 'somethings went wrong!' },
  //   });

  const otpModelObj = {
    otp,
    mobileNumber,
    sendTimes: alreadyOtpSent + 1,
    lastOtpSentTime: new Date(),
    method,
  };
  if (isOtpDataExist)
    await updateQuery(otpSentModel, { _id: isOtpDataExist._id }, otpModelObj);
  else await createQuery(otpSentModel, otpModelObj);
  return SendSuccessResponse({
    res,
    data: { message: 'Otp sent successfully!' },
  });
};

const VerifyOtp = async (req, res) => {
  let {
    n: mobileNumber,
    t: userType,
    m: method,
    o: otp,
    fcmToken,
    deviceInfo,
  } = req.query;
  console.log('fcmtoken122', fcmToken);
  if (!mobileNumber || !method || !otp || !fcmToken || !deviceInfo)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Please send all required fields!' },
    });
  if (method !== 'login' && method !== 'signup')
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Please send correct method!' },
    });
  // if (userType !== 'therapist' && userType !== 'individual')
  //   return SendBadResponse({
  //     res,
  //     status: 400,
  //     data: { error: 'Please send correct usertype!' },
  //   });
  mobileNumber = '+' + mobileNumber.trim();
  console.log(mobileNumber);
  console.log(method);
  console.log(otp);
  let isOtpValid = await findQuery(otpSentModel, {
    $and: [{ mobileNumber }, { otp }, { method }],
  });
  console.log('isOtpValid', isOtpValid);
  if (!isOtpValid)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Invaild Otp!' },
    });
  if (
    new Date().getTime() >
    new Date(isOtpValid.lastOtpSentTime).getTime() + 10 * 60 * 1000
  )
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Otp Expired!' },
    });
  deleteQuery(otpSentModel, { mobileNumber });
  console.log('mobileNumber122', mobileNumber);
  console.log('mobileNumber', mobileNumber);
  const [userAuthDetails] = await findQuery(authCredtionalsModel, {
    mobileNumber,
  });
  console.log('userAuthDetails', userAuthDetails);
  console.log('userAuthDetails', mobileNumber);
  if (method === 'login') {
    let [isUserExist] = await findQuery(
      userAuthDetails?.userType === 'therapist' ? therapistModel : individualModel,
      { mobileNumber }
    );
    console.log('isUserExist', isUserExist);
    if (!isUserExist)
      return SendBadResponse({
        res,
        status: 404,
        data: { error: 'No user data found!' },
      });
    console.log('isUserExist', isUserExist);
    let { notification, userExtraDetails, ...userData } =
      isUserExist?._doc || {};
    let token = genrateToken({ data: { _id: userData._id } });
    await updateQuery(
      userExtraDetailsModel,
      { _id: userExtraDetails },
      {
        lastLogin: Date.now(),
        lastJWTToken: token,
        isUserLogout: false,
        deviceInfo,
        fcmToken,
      }
    );
    return SendSuccessResponse({
      res,
      data: { isUserCreated: userData, token, userType: userAuthDetails?.userType },
    });
  }
  let { notification, userExtraDetails, ...isUserCreated } = await createQuery(
    userType === 'therapist' ? therapistModel : individualModel,
    {
      mobileNumber,
    }
  );
  await createQuery(authCredtionalsModel, {
    mobileNumber,
    userType,
    userId: isUserCreated._id,
  });
  let token = genrateToken({ data: { _id: isUserCreated._id } });
  let isUserExtraDataCreated = await createQuery(userExtraDetailsModel, {
    lastLogin: Date.now(),
    lastJWTToken: token,
    isUserLogout: false,
    userId: isUserCreated._id,
    deviceInfo,
    fcmToken,
    // userType
  });
  let isUserNotificationDataCreated = await createQuery(notificationsModel, {
    userId: isUserCreated._id,
    notifications: [],
  });
  updateQuery(
    userType === 'therapist' ? therapistModel : individualModel,
    { _id: isUserCreated._id },
    {
      userExtraDetails: isUserExtraDataCreated._id,
      notification: isUserNotificationDataCreated._id,
    }
  );
  console.log('userType12', userType, userAuthDetails?.userType);
  return SendSuccessResponse({ res, data: { isUserCreated, token, userType: userType || userAuthDetails?.userType } });
};

const Login = async (req, res) => {
  let { email, password, fcmToken, deviceInfo } = req.body;

  let [credential] = await findQuery(authCredtionalsModel, {
    $and: [{ email }],
  });
  console.log('credential', credential);
  if (!credential)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: 'User not found!' },
    });
  if (userType && credential.userType !== userType) {
    return SendBadResponse({
      res,
      status: 403,
      data: {
        error: `You are trying to log in as a ${userType}, but this email is registered as a ${credential.userType}.`,
      },
    });
  }

  const otherUserType = credential.userType === 'therapist' ? 'individual' : 'therapist';
  const [isEmailExisted] = await findQuery(
    credential.userType === 'therapist' ? individualModel : therapistModel
    , {
      email: email
    });

  if (isEmailExisted) {
    return SendBadResponse({
      res,
      status: 403,
      data: { error: `This Email is been registered with ${otherUserType}!` },
    });
  };

  const isPasswordCorrect = await comparePassword(
    password,
    credential.password
  );
  console.log('isPasswordCorrect', isPasswordCorrect);
  if (!isPasswordCorrect)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: 'Wrong Password!' },
    });


  let isUserExist = await findQuery(
    credential.userType === 'therapist' ? therapistModel : individualModel,
    { _id: credential.userId }
  );
  console.log('isUserExist', isUserExist);
  if (!isUserExist)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: 'Invaild email/password!' },
    });
  if (isUserExist?.isAccountRestricted) {
    return SendBadResponse({
      res,
      status: 400,
      data: { error: isUserExist.message },
    });
  }
  let token = genrateToken({ data: { _id: isUserExist._id } });
  console.log('token12', token);
  await updateQuery(
    userExtraDetailsModel,
    { userId: isUserExist._id },
    {
      lastLogin: Date.now(),
      lastJWTToken: token,
      fcmToken: fcmToken,
      deviceInfo: deviceInfo,
      isUserLogout: false,
      // lastLogout: null,
    }
  );
  const topics = credential.userType === 'therapist' ? ['all-users', 'therapist-subscribed'] : ['all-users', 'individual-subscribed'];
  const subscriptions = topics.map((topic) => {
    const token = fcmToken;
    if (!/^[a-zA-Z0-9-_.~%]+$/.test(topic)) {
      throw new Error(`Invalid topic name: ${topic}`);
    }
    admin.messaging().subscribeToTopic(token, topic);
  });
  await Promise.all(subscriptions);
  console.log(`Successfully subscribed to topics: ${topics.join(", ")}`);
  return SendSuccessResponse({ res, data: { userData: isUserExist, token, userType: credential.userType } });
};

const ForgetPassword = async (req, res) => {
  let { otp, password, mobileNumber } = req.body;
  console.log('req,,', req.body);
  otp = '121'
  console.log('otp', otp);
  let [isOtpValid] = await findQuery(otpSentModel, {
    $and: [{ mobileNumber }, { otp }, { method: 'forgetPassword' }],
  });
  if (!isOtpValid)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Invaild Otp!' },
    });
  if (
    new Date().getTime() >
    new Date(isOtpValid.lastOtpSentTime).getTime() + 10 * 60 * 1000
  )
    return SendBadResponse({
      res,
      status: 400,
      data: { error: 'Otp Expired!' },
    });
  deleteQuery(otpSentModel, { mobileNumber });
  let hashedPassword = await genratePasswordHash(password);
  await updateQuery(
    authCredtionalsModel,
    { mobileNumber },
    {
      password: hashedPassword,
    }
  );
  return SendSuccessResponse({
    res,
    data: { message: 'Password reset successfully!' },
  });
};

module.exports = { GetOtp, VerifyOtp, ForgetPassword, Login };
