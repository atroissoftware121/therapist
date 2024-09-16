const { Router } = require('express');
const { celebrate, Joi, Segments } = require('celebrate');
const { createAdminSetting, updateAdminSetting, updateIndividualData }  = require('../controllers/adminController');
const { upload } = require('../helpers/s3Helper');

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

  route.put(
    '/updateIndividual',
    upload.single('individualImage'),
    updateIndividualData
  );
};
