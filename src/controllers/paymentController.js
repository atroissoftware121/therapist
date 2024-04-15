const razorpay = require('razorpay');
const paymentModel = require('../mongooseModels/payment.model');
const { RAZOR_API_KEY, RAZOR_API_SECRET } = require('../config/index');
const catchAsync = require('../utils/catchAsync');
const {
  createQuery,
  findQuery,
} = require('../helpers/mongooseHelpers');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');

const instance = new razorpay({
  key_id: 'rzp_test_boGgK2ISPb6yKi',
  key_secret: 'GjBdUnPdO9CymkMwaX8H7p3T',
});

const fetchPayment = catchAsync(async (req, res) => {
  const { paymentId, recieverId, senderId } = req.query;
  let paymentData = await instance.payments.fetch(paymentId);
  const payment = paymentMapper(paymentData, recieverId, senderId);
  const paymentCreated = await createQuery(paymentModel, payment)
  res.status(200).send(paymentCreated);
});

const refundPayment = catchAsync(async (req, res) => {
  const { paymentId, amount } = req.body;
  const refundData = await refunds.create(paymentId, {
    amount: amount,
    speed: 'normal'
  });

  res.status(200).send(refundData);
});

const paymentMapper = (paymentData, recieverId, senderId) => {
  switch(true) {
    case 'card' in paymentData:
      paymentData = { card: paymentData.card, ...paymentData };
      break;
    case 'acquirer_data' in paymentData:
      paymentData = { bank_transaction_id: paymentData.acquirer_data?.bank_transaction_id, ...paymentData };
      break;
    case 'upi' in paymentData:
      paymentData = { bank_transaction_id: paymentData.upi?.vpa, ...paymentData };
      break;
    default:
      paymentData = { wallet_transaction_id: paymentData.acquirer_data?.transaction_id, ...paymentData };
      break;
  }
  
  return {
    recieverId,
    senderId,
    paymentId: paymentData.id,
    paymentType: paymentData.method,
    refundAmount: paymentData.amount_refunded,
    ...paymentData,
  };
};

const paymentfetchByUser = catchAsync(async(req,res) => {
  const { recieverId, senderId } = req.query;
  const userId = recieverId ? { recieverId }: { senderId };
  const fetchPayment = await findQuery(paymentModel, userId);
  if(!fetchPayment) {
    return SendBadResponse({
      res,
      status: 404,  
      data: {
        error: 'No user found',
      },
    });
  }

  return SendSuccessResponse({ res, data: { data: fetchPayment } });
});

module.exports = { fetchPayment, refundPayment, paymentfetchByUser };