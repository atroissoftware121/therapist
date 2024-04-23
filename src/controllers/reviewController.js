const reviewModel = require('../mongooseModels/review.model');
const therapistModel = require('../mongooseModels/therapist.model');
const individualModel = require('../mongooseModels/individual.model');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const { findQuery } = require('../helpers/mongooseHelpers');

const postReview = async (req, res) => {
  const { individualId, therapistId } = req.body;
  const individualIdExist = await findQuery(individualModel, {
    _id: individualId,
  });
  if (!individualIdExist)
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'Individual does not exists',
      },
    });
  const therapistIdExist = await findQuery(therapistModel, {
    _id: therapistId,
  });
  if (!therapistIdExist)
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'therapist does not exist',
      },
    });
  const createReview = await reviewModel.create({
    ...req.body,
  });

  return SendSuccessResponse({
    res,
    data: { message: 'review update', data: createReview },
  });
};

const getReview = async (req, res) => {
  const { therapistId, individualId } = req.query;
  const userId = individualId ? { individualId } : { therapistId };

  const review = await findQuery(reviewModel, userId);

  if (!review)
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'no reviews',
      },
    });

  return SendSuccessResponse({
    res,
    data: { data: review },
  });
};

module.exports = {
  postReview,
  getReview,
};
