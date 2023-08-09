const { expressjwt } = require("express-jwt");
const { JWT_ALGO, JWT_SECRET } = require("../config");
const { getTokenData } = require("../helpers/jwtHelpers");
const { findQuery } = require("../helpers/mongooseHelpers");
const { SendBadResponse } = require("../helpers/responseHelpers");
const therapistModel = require("../mongooseModels/therapist.model");
const individualModel = require("../mongooseModels/individual.model");

const getTokenFromHeader = (req) => {
  if (
    req?.headers?.authorization?.split(" ")[0] === "Token" ||
    req?.headers?.authorization?.split(" ")[0] === "Bearer"
  )
    return req.headers.authorization.split(" ")[1];
  return null;
};

const isAuthorized = expressjwt({
  secret: JWT_SECRET,
  algorithms: [JWT_ALGO],
  userProperty: "token",
  credentialsRequired: true,
  getToken: getTokenFromHeader,
});

const injectTherapistDetails = async (req, res, next) => {
  let token = getTokenFromHeader(req);
  let decodedValue = await getTokenData(token);
  if (!decodedValue)
    return SendBadResponse({
      res,
      status: 401,
      data: { error: "Token invaild!" },
    });
  let isUserExist = await findQuery(therapistModel, {
    _id: decodedValue._id,
  });
  if (!isUserExist)
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "User not found!" },
    });
  req.user = isUserExist;
  next();
};

const injectIndividualDetails = async (req, res, next) => {
  let token = getTokenFromHeader(req);
  let decodedValue = await getTokenData(token);
  if (!decodedValue)
    return SendBadResponse({
      res,
      status: 401,
      data: { error: "Token invaild!" },
    });
  let isUserExist = await findQuery(individualModel, {
    _id: decodedValue._id,
  });
  if (!isUserExist)
    return SendBadResponse({
      res,
      status: 404,
      data: { error: "User not found!" },
    });
  req.user = isUserExist;
  next();
};

module.exports = {
  isAuthorized,
  injectTherapistDetails,
  injectIndividualDetails,
};
