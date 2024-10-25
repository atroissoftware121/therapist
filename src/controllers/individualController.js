const { genratePasswordHash } = require("../helpers/bcryptHelper");
const { findQuery, updateQuery, findQueryWithPagining } = require("../helpers/mongooseHelpers");
const {
  SendBadResponse,
  SendSuccessResponse,
} = require("../helpers/responseHelpers");
const authCredtionalsModel = require("../mongooseModels/authCredtionals.model");
const individualModel = require("../mongooseModels/individual.model");
const sendEmail = require("../utils/emailer");
const pick = require("../utils/pick");
const therapistModel = require("../mongooseModels/therapist.model");
const userExtraDetailsModel = require('../mongooseModels/userExtraDetails.model');

const IndividualProfileUpdate = async (req, res) => {
  const { fname, lname, email, gender, image } = req.body;
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
    individualModel,
    { _id },
    {
      fname,
      lname,
      email,
      gender,
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
};

const IndividualRegister = async (req, res) => {
  const { fname, lname, email, gender, password, image } = req.body;
  const { _id, mobileNumber, ...user } = req.user;
  let [isEmailExist] = await findQuery(authCredtionalsModel, {
    email,
  });

  if (isEmailExist && isEmailExist.userType === 'therapist') {
    return SendBadResponse({
      res,
      status: 505,
      data: {
        error: "This email is been registered with therapist!",
      },
    });
  }

  if (isEmailExist)
    return SendBadResponse({
      res,
      status: 505,
      data: {
        error: "Email already exist!",
      },
    });
  let isUserUpdated = await updateQuery(
    individualModel,
    { _id },
    {
      fname,
      lname,
      email,
      gender,
      image,
    }
  );
  let hashedPassword = await genratePasswordHash(password);
  await updateQuery(
    authCredtionalsModel,
    { userId: _id },
    {
      email,
      password: hashedPassword,
    }
  );
  await updateQuery(
    userExtraDetailsModel,
    { userId: _id },
    {
      email,
    }
  );
  const message = 'Individual Registration on Sahhaya'

  const text = "Congratulations! Your Individual account on Sahhaya is registered now and ready to use.  Please login on ….. app link……\nTeam Sahhaya";

  sendEmail(email, message, text);
  return SendSuccessResponse({
    res,
    data: { message: "Register successfully!", data: isUserUpdated },
  });
};

const fetchUserList = async (req, res) => {
  const options = pick(req.query, ["limit", "page"]);
  console.log(options);

  const userList = await findQueryWithPagining(
    req.query.therapists ? therapistModel : individualModel,
    null,
    options
  );

  return SendSuccessResponse({
    res,
    data: { message: "Profile fetch successfully!", data: userList },
  });
};

module.exports = { IndividualProfileUpdate, IndividualRegister, fetchUserList };
