const { genratePasswordHash } = require("../helpers/bcryptHelper");

const {
  findQuery,
  updateQuery,
  findQueryWithPagining,
  findQueryWithLimit
} = require("../helpers/mongooseHelpers");
const catchAsync = require("../utils/catchAsync");
const sendEmail = require("../utils/emailer");
const { sendSMS } = require("../helpers/twilloHelpers");
const ApiError = require("../utils/ApiError");
const httpStatus = require("http-status");
const userExtraDetailsModel = require('../mongooseModels/userExtraDetails.model');
const {
  SendSuccessResponse,
  SendBadResponse,
} = require("../helpers/responseHelpers");
const authCredtionalsModel = require("../mongooseModels/authCredtionals.model");
const therapistModel = require("../mongooseModels/therapist.model");
const pick = require("../utils/pick");
const {admin} = require('../config/messaging-system');

const TherapistRegisterStepFirst = catchAsync(async (req, res) => {
  const { name, email, password, image } = req.body;
  const { _id, mobileNumber, ...user } = req.user;
  let [isEmailExist] = await findQuery(authCredtionalsModel, { email });
  if (isEmailExist)
    return SendBadResponse({
      res,
      status: 505,
      data: {
        error: "Email already exist!",
      },
    });
  let isUserUpdated = await updateQuery(
    therapistModel,
    { _id },
    {
      name,
      email,
      image,
    }
  );
  let hashedPassword = await genratePasswordHash(password);
  await updateQuery(
    authCredtionalsModel,
    { mobileNumber },
    {
      password: hashedPassword,
      email,
    }
  );

  return SendSuccessResponse({
    res,
    data: { message: "Step first complete successfully!", data: isUserUpdated },
  });
});

const TherapistRegisterStepSecond = catchAsync(async (req, res) => {
  const {
    age,
    specialization,
    qualification,
    charges,
    language,
    gender,
    summary,
    location,
    experience,
    // image
    documents,
  } = req.body;
  const { _id, ...user } = req.user;
  let isUserUpdated = await updateQuery(
    therapistModel,
    { _id },
    {
      age,
      specialization,
      charges,
      language,
      gender,
      summary,
      location,
      documents,
      qualification,
      experience,
    }
  );
  return SendSuccessResponse({
    res,
    data: { message: "Register successfully!", data: isUserUpdated },
  });
});

const TherapistUpdateProfile = catchAsync(async (req, res) => {
  const {
    name,
    email,
    age,
    specialization,
    charges,
    language,
    summary,
    location,
    qualification,
    image,
    gender,
    experience,
  } = req.body;
  const { _id, mobileNumber, ...user } = req.user;
  
  let [isEmailExist] = await findQuery(authCredtionalsModel, {
    $and: [{ email }, { userId: { $nin: [_id] } }],
  });
  if (isEmailExist)
    return SendBadResponse({
      res,
      status: 505,
      data: {
        error: "Email already exist!",
      },
    });
  let isUserUpdated = await updateQuery(
    therapistModel,
    { _id },
    {
      name,
      email,
      age,
      specialization,
      charges,
      language,
      summary,
      location,
      qualification,
      image,
      gender,
      experience,
    }
  );
  await updateQuery(
    authCredtionalsModel,
    { userId: _id },
    {
      email,
    }
  );
  return SendSuccessResponse({
    res,
    data: { message: "Profile update successfully!", data: isUserUpdated },
  });
});

const TherapistAddOffer = catchAsync(async (req, res) => {
  const { discountedCharges } = req.body;
  const { _id } = req.user;
  await updateQuery(
    therapistModel,
    { _id },
    {
      discountedCharges,
    }
  );
  return SendSuccessResponse({
    res,
    data: { message: "discounted price update successfully!" },
  });
});

const TherapistTopList = catchAsync(async (req, res) => {
  const list = await findQuery(
    therapistModel,
    { isProfileVerified: true },
    "name email mobileNumber gender image specialization qualification charges discountedCharges location language summary isOnline onCall experience review",
    5
  );
  return SendSuccessResponse({
    res,
    data: { message: "Therapist list get successfully!", data: list },
  });
});

const TherapistList = catchAsync(async (req, res) => {
  let { page, priceS, priceE, ageS, ageE, lang, specialization,sKeyword, gender  } = req.query;
  let findQueryArr=[]
  findQueryArr.push({ isProfileVerified: true });
  let skip = 0;
  let limit = 20;
  let languageArr = lang?.split(",") || [];
  if (page) {
    page = parseInt(page);
    limit = page * 20;
    skip = (page - 1) * 20;
  }
  if (languageArr.length > 0) {
    const languageRegex = languageArr.map(lang => new RegExp(lang.trim(), 'i'));
    findQueryArr.push({ language: { $in: languageRegex } });
  }
  if (gender) {
    const genderArr = gender.split(',');
    findQueryArr.push({ gender: { $in: genderArr } });
  }
  
  if (priceS) findQueryArr.push({ charges: { $gte: parseInt(priceS) } });
  if (priceE) findQueryArr.push({ charges: { $lte: parseInt(priceE) } });
  if (ageS) findQueryArr.push({ age: { $gte: parseInt(ageS) } });
  if (ageE) findQueryArr.push({ age: { $lte: parseInt(ageE) } });
  if (specialization) findQueryArr.push({ specialization });
  if (sKeyword) {
    findQueryArr.push(
      {$or: [
      { name: { $regex: sKeyword, $options: 'i' } }, // 'i' makes the search case-insensitive
      { specialization: { $in: [new RegExp(sKeyword, 'i')] } } // 'i' for case-insensitive
    ],});
  }

  let findQueryObj = {};
  if (findQueryArr.length > 0) findQueryObj = { $and: findQueryArr };
  const list = await findQueryWithLimit(
    therapistModel,
    findQueryObj,
    "name email mobileNumber gender image specialization qualification charges discountedCharges location language summary isOnline onCall experience review",
    limit,
    skip
  );

  return SendSuccessResponse({
    res,
    data: { message: "Therapist list get successfully!", data: list },
  });
});                     

const TherapistListForApproval = catchAsync(async (req, res) => {
  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Permission Denied");
  }
  const options = pick(req.query, ["limit", "page"]);
  const list = await findQueryWithPagining(
    therapistModel,
    { isAdmin: false },
    options
  );
  return SendSuccessResponse({
    res,
    data: { message: "Therapist list get successfully!", data: list },
  });
});


const ApproveTherapist = catchAsync(async (req, res) => {
  let { _id } = req.body;
  const { isAdmin } = req.user;
  if (!isAdmin) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Permission Denied");
  }
  let therapist = await findQuery(therapistModel, { _id });
  console.log('therapist', therapist);
  if (!therapist) {
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "Therapist Not Found!" },
    });
  }
  const [therapistData] = await findQuery(userExtraDetailsModel, {
    userId: _id,
  });
  console.log('therapistData', therapistData);
  if (!therapist.email || !therapist.documents.length) {
    return SendBadResponse({
      res,
      status: 400,
      data: { error: "Therapist registration not complete!" },
    });
  }
  const response = await updateQuery(
    therapistModel,
    { _id },
    { isProfileVerified: true }
  );
  const message = 'Profile Verified'
    
  const text = "Congratulations! Your Therapist account on Sahhaya is active and ready to use.  Please login on ….. app link……\nTeam Sahhaya";

  sendEmail(therapist.email, message, text);
  sendSMS({
    to: therapist.mobileNumber,
    body: message,
  });
  if (therapistData && therapistData.fcmToken) {
    const message = {
      notification: {
        title: `${response.name}`,
        body: `Profile Verified`,
      },
      data: {
        // senderId: therapistId,
        receiverId: _id,
        title: `${response.name}`,
        body: `Profile Verified`,
      },
      token: therapistData.fcmToken,
    };
    console.log('data122222', message);
    await admin.messaging().send(message);
  }
  return SendSuccessResponse({
    res,
    data: { message: "Therapist sucessfully approved!", data: response },
  });
});

const TherapistDetailGet = catchAsync(async (req, res) => {
  let { _id } = req.params;
  let  selection =
      "name image specialization qualification charges discountedCharges location language summary isOnline onCall";
  let therapist = await findQuery(therapistModel, { _id }, selection);
  return SendSuccessResponse({
    res,
    data: { message: "Therapist detail get successfully!", data: therapist },
  });
});

module.exports = {
  TherapistRegisterStepFirst,
  TherapistRegisterStepSecond,
  TherapistUpdateProfile,
  TherapistAddOffer,
  TherapistList,
  TherapistTopList,
  TherapistDetailGet,
  TherapistListForApproval,
  ApproveTherapist,
};
