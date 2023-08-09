const SendSuccessResponse = ({ res, data = {} }) =>
  res.status(200).json({ success: true, ...data });

const SendBadResponse = ({ res, status, data = {} }) =>
  res.status(status).json({ success: false, ...data });

module.exports = { SendSuccessResponse, SendBadResponse };
