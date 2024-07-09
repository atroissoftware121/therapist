const razorpay = require('razorpay');
const paymentModel = require('../mongooseModels/payment.model');
const therapistModel = require('../mongooseModels/therapist.model');
const { RAZOR_API_KEY, RAZOR_API_SECRET } = require('../config/index');
const catchAsync = require('../utils/catchAsync');
const axios = require('axios');
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
const transactionModel = require('../mongooseModels/individual-transaction.model');
const { points } = require('../constants/loyalty-points.constant');
const { walletPoints } = require('../constants/add-points-to-wallet.constant');

const instance = new razorpay({
  key_id: RAZOR_API_KEY,
  key_secret: RAZOR_API_SECRET,
});

const fetchPayment = catchAsync(async (req, res) => {
  const { paymentId, senderId } = req.query;
  if (paymentId === 'undefined' || senderId === 'undefined') {
    return SendBadResponse({
      res,
      status: 400,
      data: {
        error: 'paymentId and senderId cannot be undefined',
      },
    });
  }
  let addWallet;
  if (!paymentId) {
    addWallet = await findQuery(individualModel, { _id: senderId });
  } else {
    const [isPaymentExist] = await findQuery(paymentModel, { paymentId });
    if (!isPaymentExist) {
      let paymentData = await instance.payments.fetch(paymentId);
      let formattedAmount = (paymentData.amount / 100).toFixed(2);
      const amountAfterGst = originalValueAfterPercentage(formattedAmount);
      const loyaltyPoints = points[amountAfterGst];
      paymentData = {
        ...paymentData,
        amount: amountAfterGst,
      };
      const payment = paymentMapper(paymentData, senderId);
      await createQuery(paymentModel, payment);
      addWallet = await updateQuery(
        individualModel,
        { _id: senderId },
        { $inc: { wallet: amountAfterGst, loyaltyPoints } }
      );
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
    speed: 'normal',
  });

  res.status(200).send(refundData);
});

const paymentMapper = (paymentData, senderId) => {
  switch (true) {
    case 'card' in paymentData:
      paymentData = { card: paymentData.card, ...paymentData };
      break;
    case 'acquirer_data' in paymentData:
      paymentData = {
        bank_transaction_id: paymentData.acquirer_data?.bank_transaction_id,
        ...paymentData,
      };
      break;
    case 'upi' in paymentData:
      paymentData = {
        bank_transaction_id: paymentData.upi?.vpa,
        ...paymentData,
      };
      break;
    default:
      paymentData = {
        wallet_transaction_id: paymentData.acquirer_data?.transaction_id,
        ...paymentData,
      };
      break;
  }

  return {
    senderId,
    paymentId: paymentData.id,
    paymentType: paymentData.method,
    refundAmount: paymentData.amount_refunded,
    ...paymentData,
  };
};

const paymentfetchByUser = catchAsync(async (req, res) => {
  const { recieverId, senderId } = req.query;
  const userId = recieverId ? { recieverId } : { senderId };
  const fetchPayment = await findQuery(paymentModel, userId);
  if (!fetchPayment) {
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

function originalValueAfterPercentage(totalAmount) {
  const gstPercentage = 18;
  const decimalPercentage = gstPercentage / 100;
  const originalValue = totalAmount / (1 + decimalPercentage);
  return originalValue;
}

const addWallet = async (req, res) => {
  const { individualId, points } = req.query;
  const wallet = walletPoints[points];
  // const [individualData] = await findQuery(individualModel, {"_id": individualId, "loyaltyPoints": { "$gte": 11500 }});
  const individualData = await individualModel.findOne({
    _id: individualId,
    loyaltyPoints: { $gte: 11500 },
  });
  if (!individualData) {
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'User not found or loyalty points are insufficient.',
      },
    });
  }

  const updateWallet = await updateQuery(
    individualModel,
    { _id: individualId },
    { $inc: { wallet, loyaltyPoints: -points } }
  );
  return SendSuccessResponse({ res, data: { data: updateWallet } });
};

const addFundAccount = catchAsync(async (req, res) => {
  try{

    const {
      name,
      email,
      mobileNumber,
      therapistId,
      account_type,
      account_number,
      ifsc,
      upi_id,
      isEdit,
    } = req.body;
    console.log('req.body', req.body);
    const [isAccountExists] = await findQuery(transactionModel, { therapistId });
    console.log('isAccountExists', isAccountExists);
  
    const contactData = {
      name,
      email,
      contact: mobileNumber,
      type: 'customer',
    };
  
    const response = await axios.post(
      'https://api.razorpay.com/v1/contacts',
      contactData,
      {
        auth: {
          username: RAZOR_API_KEY,
          password: RAZOR_API_SECRET,
        },
      }
    );
    const data =
      account_type === 'bank_account'
        ? {
            bank_account: {
              ifsc,
              name,
              account_number,
            },
          }
        : {
            vpa: {
              address: upi_id,
            },
          };
    const options = {
      ...data,
      account_type,
      contact_id: response.data.id,
    };
    console.log('options12', options);
    const createFund = await instance.fundAccount.create(options);
    console.log('createFund', createFund);
    const transactionData = {
      therapistId,
      fund_id: createFund.id,
      ...createFund,
    };
    console.log('transactionData', transactionData);
    if (isAccountExists && isEdit === true) {
      await updateQuery(transactionModel, { therapistId }, transactionData);
    } else {
      await createQuery(transactionModel, transactionData);
    }
    return SendSuccessResponse({ res, data: { data: createFund } });
  }catch(err) {
    console.log('errr1222', err.message);
  }
});

const createPayout = catchAsync(async (req, res) => {
  const { amount, therapistId } = req.body;
  const transaction = await findQuery(transactionModel, { therapistId });
  if (!transaction) {
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'transaction not found',
      },
    });
  }
  const mode = transaction.account_type === 'bank_account' ? 'IMPS' : 'UPI';
  const payoutData = {
    amount,
    mode,
    account_number: '7878780080316316',
    fund_account_id: transaction.fund_id,
    currency: 'INR',
    queue_if_low_balance: true,
    narration: 'Sahaya Corp Fund Transfer',
    purpose: 'payout',
  };
  const response = await axios.post(
    'https://api.razorpay.com/v1/payouts',
    payoutData,
    {
      auth: {
        username: RAZOR_API_KEY,
        password: RAZOR_API_SECRET,
      },
    }
  );

  return SendSuccessResponse({ res, data: { data: response.data } });
});

const updateStatus = async (req, res) => {
  const { payment } = req.body.payload;
  if (payment.entity.status === 'captured') {
    const updatePayment = await updateQuery(
      paymentModel,
      { paymentId: payment.entity.id },
      { status: payment.entity.status }
    );
    const addStatus = await updateQuery(
      therapistModel,
      { _id: updatePayment.recieverId },
      { $inc: { wallet: payment.entity.amount } }
    );
    return SendSuccessResponse({ res, data: addStatus });
  }
};

const fetchAccountDetails = catchAsync(async (req, res) => {
  const { therapistId } = req.query;
  const fetchData = await findQuery(transactionModel, { therapistId });
  if (!fetchData) {
    return SendBadResponse({
      res,
      status: 404,
      data: {
        error: 'transaction not found',
      },
    });
  }

  return SendSuccessResponse({ res, data: { data: fetchData } });
});

const fetchTherapistWallet = async(req, res) => {
  const { therapistId } = req.query;
  const therapistWallet = await findQuery(therapistModel, {_id: therapistId});

  return SendSuccessResponse({ res, data: { data: therapistWallet } });
};

module.exports = {
  fetchPayment,
  refundPayment,
  paymentfetchByUser,
  addWallet,
  addFundAccount,
  createPayout,
  updateStatus,
  fetchAccountDetails,
  fetchTherapistWallet,
};
