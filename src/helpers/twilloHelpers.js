const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILLO_SMS_NUMBER,
} = require("../config");

const client = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const genrateOtp = () => Math.floor(1000 + Math.random() * 9000);

const sendSMS = ({ from = TWILLO_SMS_NUMBER, body, to }) => {
  return new Promise((resolve, reject) => {
    client.messages
      .create({ from, body, to })
      .then((message) => resolve(true))
      .catch((err) => {
        console.log("sendSMS error==>", err);
        resolve(false);
      });
  });
};

module.exports = { sendSMS, genrateOtp };
