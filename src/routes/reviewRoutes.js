const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const { postReview, getReview, replyTherapist } = require('../controllers/reviewController');

module.exports = (app) => {
  const route = Router();
  app.use('/review', route);
  route.post(
    '/postReview',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        individualId: Joi.string().required(),
        therapistId: Joi.string().required(),
        consultationId: Joi.string().required(),
        comments: Joi.string().optional(),
        rating: Joi.number().optional(),
        chatType: Joi.string().required(),
      }),
    }),
    postReview
  );

  route.get(
    '/getReview',
    celebrate({
      [Segments.QUERY]: Joi.object().keys({
        individualId: Joi.string().optional(),
        therapistId: Joi.string().optional(),
        consultationId: Joi.string().optional(),
      }),
    }),
    getReview
  );
  route.put(
    '/reply-review-therapist',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        reviewId: Joi.string().required(),
        therapistComment: Joi.string().required(),
      }),
    }),
    replyTherapist
  );
};
