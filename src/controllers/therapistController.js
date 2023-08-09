const { genratePasswordHash } = require("../helpers/bcryptHelper");
const { findQuery, updateQuery } = require("../helpers/mongooseHelpers");
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const {
  SendSuccessResponse,
  SendBadResponse,
} = require("../helpers/responseHelpers");
const authCredtionalsModel = require("../mongooseModels/authCredtionals.model");
const therapistModel = require("../mongooseModels/therapist.model");

const TherapistRegisterStepFirst =catchAsync( async (req, res) => {
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
    summary,
    location,
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
      summary,
      location,
      documents,
      qualification,
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

const TherapistTopList =catchAsync( async (req, res) => {
  const list = await findQuery(
    therapistModel,
    { isProfileVerified: true },
    "name image specialization qualification charges discountedCharges location language summary isOnline onCall",
    5
  );
  return SendSuccessResponse({
    res,
    data: { message: "Therapist list get successfully!", data: list },
  });
});

const TherapistList = catchAsync(async (req, res) => {
  let { page, priceS, priceE, ageS, ageE, lang, specialization } = req.query;
  let findQueryArr=findQueryArr.push({ isProfileVerified: true });
  let skip = 0;
  let limit = 20;
  let languageArr = lang?.split(",") || [];
  if (page) {
    page = parseInt(page);
    limit = page * 20;
    skip = (page - 1) * 20;
  }
  if (languageArr.length > 0)
    findQueryArr.push({ language: { $in: languageArr } });
  if (priceS) findQueryArr.push({ charges: { $gte: parseInt(priceS) } });
  if (priceE) findQueryArr.push({ charges: { $lte: parseInt(priceE) } });
  if (ageS) findQueryArr.push({ age: { $gte: parseInt(ageS) } });
  if (ageE) findQueryArr.push({ age: { $lte: parseInt(ageE) } });
  if (specialization) findQueryArr.push({ specialization });

  let findQueryObj = {};
  if (findQueryArr.length > 0) findQueryObj = { $and: findQueryArr };
  const list = await findQuery(
    therapistModel,
    findQueryObj,
    "name image specialization qualification charges discountedCharges location language summary isOnline onCall",
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
  if(!isAdmin){
    throw new ApiError(httpStatus.UNAUTHORIZED, "Permission Denied");
  }
  const list = await findQuery(
    therapistModel,
    { isAdmin: false }
  );
  return SendSuccessResponse({
    res,
    data: { message: "Therapist list get successfully!", data: list },
  });
});

const TherapistDetailGet = catchAsync(async (req, res) => {
  let { _id } = req.params;
  const { isAdmin } = req.user;
  let selection
  if(!isAdmin){
    selection= "name image specialization qualification charges discountedCharges location language summary isOnline onCall"

  }
  let therapist = await findQuery(
    therapistModel,
    { _id },
    selection
  );
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
  TherapistListForApproval
};
