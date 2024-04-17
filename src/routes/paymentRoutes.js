const { Router } = require("express");
const { celebrate, Joi, Segments } = require('celebrate');
const {
  fetchPayment,
  refundPayment,
  paymentfetchByUser,
  addWallet,
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
};
