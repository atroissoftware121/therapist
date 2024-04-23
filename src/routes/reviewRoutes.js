const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const { postReview, getReview } = require('../controllers/review.Controller');

module.exports = (app) => {
  const route = Router();
  app.use('/review', route);
  route.post(
    '/postReview',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        individualId: Joi.string().required(),
        therapistId: Joi.string().required(),
        comments: Joi.string().optional(),
        rating: Joi.number().optional(),
      }),
    }),
    postReview
  );

  route.get('/getReview', getReview);
};
