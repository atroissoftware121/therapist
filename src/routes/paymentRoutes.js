const { Router } = require("express");
const { celebrate, Joi, Segments } = require('celebrate');
const {
  fetchPayment,
  refundPayment,
  paymentfetchByUser,
  addWallet,
  addFundAccount,
  createPayout,
  updateStatus,
  fetchAccountDetails,
} = require("../controllers/paymentController");

module.exports = (app) => {
  const route = Router();
  app.use("/payment", route);

  route.get(
    "/fetch-payment",
    celebrate({
      [Segments.QUERY]: Joi.object().keys({
        paymentId: Joi.string().optional(),
        senderId: Joi.string().required(),
      }),
    }),
    fetchPayment,
  );
  route.post(
    "/refund-payment",
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        paymentId: Joi.string().required(),
        amount: Joi.string().required(),
      }),
    }),
    refundPayment,
  );

  route.get(
    "/fetch-payment-by-user",
    celebrate({
      [Segments.QUERY]: Joi.object().keys({
        recieverId: Joi.string().optional(),
        senderId: Joi.string().optional(),
      }),
    }),
    paymentfetchByUser,
  );

  route.put(
    "/add-wallet",
    celebrate({
      [Segments.QUERY]: Joi.object().keys({
        points: Joi.number().required(),
        individualId: Joi.string().required(),
      }),
    }),
    addWallet,
  );
  route.post(
    "/add-account",
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        name: Joi.string().optional(),
        email: Joi.string().optional(),
        mobileNumber: Joi.string().optional(),
        therapistId: Joi.string().required(),
        account_type: Joi.string().optional(),
        account_number: Joi.string().optional(),
        ifsc: Joi.string().optional(),
        upi_id: Joi.string().optional(),
        isEdit: Joi.boolean().optional(),
      }),
    }),
    addFundAccount,
  );
  route.post(
    "/create-payout",
    celebrate({
      [Segments.BODY]: Joi.object().keys({
        amount: Joi.number().required(),
      }),
    }),
    createPayout,
  );
  route.post('/createData', updateStatus);
  route.get('/fetchAccountDetails', celebrate({
    [Segments.QUERY]: Joi.object().keys({
      therapistId: Joi.string().required(),
    }),
  }),
  fetchAccountDetails,
  )
};
