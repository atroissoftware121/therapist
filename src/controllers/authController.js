const {
  findQuery,
  updateQuery,
  createQuery,
  deleteQuery,
  findOneQuery,
} = require("../helpers/mongooseHelpers");
const {
  SendBadResponse,
  SendSuccessResponse,
} = require("../helpers/responseHelpers");
const { sendSMS, genrateOtp } = require("../helpers/twilloHelpers");
const authCredtionalsModel = require("../mongooseModels/authCredtionals.model");
const otpSentModel = require("../mongooseModels/otpSent.model");
const therapistModel = require("../mongooseModels/therapist.model");
const individualModel = require("../mongooseModels/individual.model");
const notificationsModel = require("../mongooseModels/notifications.model");
const { getSignupOtpString } = require("../stringTemplates");
const { genrateToken } = require("../helpers/jwtHelpers");
const {
  genratePasswordHash,
  comparePassword,
} = require("../helpers/bcryptHelper");
const userExtraDetailsModel = require("../mongooseModels/userExtraDetails.model");

const GetOtp = async (req, res) => {
  let { n: mobileNumber, t: userType, m: method } = req.query;
  if (!mobileNumber || !userType || !method)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send all required fields!" },
    });
  if (method !== "login" && method !== "signup" && method !== "forgetPassword")
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send correct method!" },
    });
  if (userType !== "therapist" && userType !== "individual")
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send correct usertype!" },
    });
  mobileNumber = "+" + mobileNumber.trim();
  let [isMobileNumberExist] = await findQuery(authCredtionalsModel, {
    mobileNumber,
  });
  let [isNumberExistWithUsertype] = await findQuery(authCredtionalsModel, {
    $and: [{ mobileNumber }, { userType }],
  });

  if (
    (method === "login" || method === "forgetPassword") &&
    !isNumberExistWithUsertype
  )
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "User not found!" },
    });

  if (method === "signup" && isMobileNumberExist)
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "User already exist! Please try to login." },
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
      data: { error: "limit exceeded! Please try after one day." },
    });

  let otp = genrateOtp();
  let messageResponse = await sendSMS({
    to: mobileNumber,
    body: getSignupOtpString(otp),
  });
  if (!messageResponse)
    return SendBadResponse({
      res,
      status: 503,
      data: { error: "somethings went wrong!" },
    });

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
    data: { message: "Otp sent successfully!" },
  });
};

const VerifyOtp = async (req, res) => {
  let { n: mobileNumber, t: userType, m: method, o: otp,fcmToken,deviceInfo } = req.query;
  if (!mobileNumber || !userType || !method || !otp)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send all required fields!" },
    });
  if (method !== "login" && method !== "signup")
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send correct method!" },
    });
  if (userType !== "therapist" && userType !== "individual")
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Please send correct usertype!" },
    });
  mobileNumber = "+" + mobileNumber.trim();
  console.log(mobileNumber);
  console.log(method);
  console.log(otp);
  let isOtpValid = await findQuery(otpSentModel, {
    $and: [{ mobileNumber }, { otp }, { method }],
  });
  console.log(isOtpValid);
  if (!isOtpValid)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Invaild Otp!" },
    });
  if (
    new Date().getTime() >
    new Date(isOtpValid.lastOtpSentTime).getTime() + 10 * 60 * 1000
  )
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Otp Expired!" },
    });
  deleteQuery(otpSentModel, { mobileNumber });
  if (method === "login") {
    let [isUserExist] = await findQuery(
      userType === "therapist" ? therapistModel : individualModel,
      { mobileNumber }
    );
    if (!isUserExist)
      return SendBadResponse({
        res,
        status: 404,
        data: { error: "No user data found!" },
      });
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
        fcmToken
      }
    );
    return SendSuccessResponse({
      res,
      data: { isUserCreated: userData, token },
    });
  }
  let { notification, userExtraDetails, ...isUserCreated } = await createQuery(
    userType === "therapist" ? therapistModel : individualModel,
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
  });
  let isUserNotificationDataCreated = await createQuery(notificationsModel, {
    userId: isUserCreated._id,
    notifications: [],
  });
  updateQuery(
    userType === "therapist" ? therapistModel : individualModel,
    { _id: isUserCreated._id },
    {
      userExtraDetails: isUserExtraDataCreated._id,
      notification: isUserNotificationDataCreated._id,
    }
  );
  return SendSuccessResponse({ res, data: { isUserCreated, token } });
};

const Login = async (req, res) => {
  let { email, password, userType, fcmToken, deviceInfo } = req.body;

  let [isEmailExist] = await findQuery(authCredtionalsModel, {
    $and: [{ email }, { userType }],
  });
  if (!isEmailExist)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: "Invaild email/password!" },
    });

  const isPasswordCorrect = await comparePassword(
    password,
    isEmailExist.password
  );
  if (!isPasswordCorrect)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: "Invaild email/password!" },
    });

  let isUserExist = await findQuery(
    userType === "therapist" ? therapistModel : individualModel,
    { _id: isEmailExist.userId }
  );
  if (!isUserExist)
    return SendBadResponse({
      res,
      status: 403,
      data: { error: "Invaild email/password!" },
    });

  let { notification, userExtraDetails, ...userData } = isUserExist?._doc || {};
  let token = genrateToken({ data: { _id: userData._id } });
  await updateQuery(
    userExtraDetailsModel,
    { userId: userData._id },
    {
      lastLogin: Date.now(),
      lastJWTToken: token,
      fcmToken:fcmToken,
      deviceInfo: deviceInfo,
      isUserLogout: false,
    }
  );
  return SendSuccessResponse({ res, data: { userData, token } });
};



const ForgetPassword = async (req, res) => {
  const { otp, password, mobileNumber } = req.body;
  let [isOtpValid] = await findQuery(otpSentModel, {
    $and: [{ mobileNumber }, { otp }, { method: "forgetPassword" }],
  });
  if (!isOtpValid)
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Invaild Otp!" },
    });
  if (
    new Date().getTime() >
    new Date(isOtpValid.lastOtpSentTime).getTime() + 10 * 60 * 1000
  )
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Otp Expired!" },
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
    data: { message: "Password reset successfully!" },
  });
};

module.exports = { GetOtp, VerifyOtp, ForgetPassword, Login };
