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
const { db } = require('../mongooseModels/userExtraDetails.model');

const postReview = async (req, res) => {
  const { individualId, therapistId, consultationId, chatType, rating } = req.body;
  const review = await findQuery(reviewModel, { therapistId });
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
  };

  const averageRating =
    ((therapistIdExist.review * review.length) + rating) / (review.length + 1);
    console.log('average', averageRating);
  await updateQuery(
    therapistModel,
    {
      _id: therapistId,
    },
    {
      review: averageRating,
    }
  );
  return SendSuccessResponse({
    res,
    data: { message: 'review update', data: createReview },
  });
};

const getReview = async (req, res) => {
  try {
    const { therapistId, individualId, consultationId } = req.query;

    let query = {};

    if (consultationId) {
      query = individualId
        ? { individualId, consultationId }
        : { therapistId };
    } else {
      query = individualId
        ? { individualId }
        : { therapistId };
    }

    const reviews = await findQuery(reviewModel, query);

    if (!reviews || reviews.length === 0) {
      return SendBadResponse({
        res,
        status: 404,
        data: { error: "no reviews" },
      });
    }

    let pushUserData = [];

    for (let review of reviews) {
      let user;

      if (therapistId) {
        user = await findQuery(individualModel, {
          _id: review.individualId,
        });
      } else {
        user = await findQuery(therapistModel, {
          _id: review.therapistId,
        });
      }

      // safety check
      if (!user) continue;

      const data = {
        ...(user._doc || user),
        postCreated: review.createdAt,
        comments: review.comments,
        rating: review.rating,
        reviewId: review._id,
        therapistComment: review?.therapistComment,
      };

      pushUserData.push(data);
    }

    return SendSuccessResponse({
      res,
      data: { data: pushUserData },
    });

  } catch (error) {
    console.error("getReview error:", error);
    return SendBadResponse({
      res,
      status: 500,
      data: { error: "internal server error" },
    });
  }
};


const replyTherapist = async(req, res) => {
  const { reviewId, therapistComment } = req.body;
  
  const updateReview = await updateQuery(reviewModel, {_id: reviewId}, {therapistComment});
  return SendSuccessResponse({
    res,
    data: { data: updateReview },
  });
};



module.exports = {
  postReview,
  getReview,
  replyTherapist,
};
