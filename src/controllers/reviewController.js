const reviewModel = require('../mongooseModels/review.model');
const therapistModel = require('../mongooseModels/therapist.model');
const individualModel = require('../mongooseModels/individual.model');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const { findQuery, updateQuery } = require('../helpers/mongooseHelpers');
const sessionModel = require('../mongooseModels/session.model');
const callDetailsModel = require('../mongooseModels/callChat-details.model');
const postReview = async (req, res) => {
  const { individualId, therapistId, consultationId, chatType } = req.body;
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

  if (chatType === 'message') {
    await updateQuery(
      sessionModel,
      { _id: consultationId },
      { isReview: true }
    );
  } else {
    await updateQuery(
      callDetailsModel,
      { _id: consultationId },
      { isReview: true }
    );
  }

  return SendSuccessResponse({
    res,
    data: { message: 'review update', data: createReview },
  });
};

const getReview = async (req, res) => {
  const { therapistId, individualId, consultationId } = req.query;
  let userId;
  if (consultationId) {
    userId = individualId ? { individualId, consultationId } : { therapistId };
  } else {
    userId = individualId ? { individualId } : { therapistId };
  }

  const reviews = await findQuery(reviewModel, userId);
  if (!reviews) {
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'no reviews',
      },
    });
  }
  let pushUserData = [];
  if (therapistId) {
    for (let review of reviews) {
      const user = await findQuery(individualModel, {
        _id: review.individualId,
      });
      const data = {
        ...user._doc,
        postCreated: review.createdAt,
        comments: review.comments,
        rating: review.rating,
      };
      pushUserData.push(data);
    }
  } else {
    for (let review of reviews) {
      const user = await findQuery(therapistModel, {
        _id: review.therapistId,
      });
      const data = {
        ...user._doc,
        postCreated: review.createdAt,
        comments: review.comments,
        rating: review.rating,
      };
      pushUserData.push(data);
    }
  }

  return SendSuccessResponse({
    res,
    data: { data: pushUserData },
  });
};

module.exports = {
  postReview,
  getReview,
};
