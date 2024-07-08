const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const { createAdminSetting, updateAdminSetting }  = require('../controllers/adminController');

module.exports = (app) => {
  const route = Router();
  app.use('/admin', route);
  route.post(
    '/addConfig',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        commissionPercentage: Joi.number().required()
      }),
    }),
    createAdminSetting
  );
  route.put(
    '/updateConfig',
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        commissionPercentage: Joi.number().required()
      }),
    }),
    updateAdminSetting
  );
};
