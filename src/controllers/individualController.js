const { genratePasswordHash } = require("../helpers/bcryptHelper");
const { findQuery, updateQuery } = require("../helpers/mongooseHelpers");
const {
  SendBadResponse,
  SendSuccessResponse,
} = require("../helpers/responseHelpers");
const authCredtionalsModel = require("../mongooseModels/authCredtionals.model");
const individualModel = require("../mongooseModels/individual.model");

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
  return SendSuccessResponse({
    res,
    data: { message: "Register successfully!", data: isUserUpdated },
  });
};

module.exports = { IndividualProfileUpdate, IndividualRegister };
