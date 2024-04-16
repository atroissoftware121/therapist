const razorpay = require('razorpay');
const paymentModel = require('../mongooseModels/payment.model');
const { RAZOR_API_KEY, RAZOR_API_SECRET } = require('../config/index');
const catchAsync = require('../utils/catchAsync');
const {
  createQuery,
  findQuery,
  updateQuery,
} = require('../helpers/mongooseHelpers');
const {
  SendBadResponse,
  SendSuccessResponse,
} = require('../helpers/responseHelpers');
const individualModel = require('../mongooseModels/individual.model');

const instance = new razorpay({
  key_id: RAZOR_API_KEY,
  key_secret: RAZOR_API_SECRET,
});

const fetchPayment = catchAsync(async (req, res) => {
  const { paymentId, senderId } = req.query;
  
  let addWallet;
  if (!paymentId) {
    addWallet = await findQuery(individualModel, { _id: senderId });
  } else {
    const [isPaymentExist] = await findQuery(paymentModel, { paymentId });
    if (!isPaymentExist) {
        let paymentData = await instance.payments.fetch(paymentId);
        let formattedAmount = (paymentData.amount / 100).toFixed(2);
        paymentData = {
          ...paymentData,
          amount: formattedAmount,
        };
        const payment = paymentMapper(paymentData, senderId);
        await createQuery(paymentModel, payment);
        addWallet = await updateQuery(individualModel, { _id: senderId }, { $inc: { wallet: formattedAmount } });
    } else {
      addWallet = await findQuery(individualModel, { _id: senderId });
    }
  }

  return SendSuccessResponse({ res, data: { data: addWallet } });
});

const refundPayment = catchAsync(async (req, res) => {
  const { paymentId, amount } = req.body;
  const refundData = await refunds.create(paymentId, {
    amount: amount,
    speed: 'normal'
  });

  res.status(200).send(refundData);
});

const paymentMapper = (paymentData, senderId) => {
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
  console.log('paymentData', paymentData);
  return {
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