const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILLO_SMS_NUMBER,
} = require("../config");

const client = require("twilio")(
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
);

// Generate 4-digit OTP
const genrateOtp = () => Math.floor(1000 + Math.random() * 9000);

// Send SMS
const sendSMS = async ({ to, body, from = TWILLO_SMS_NUMBER }) => {
  try {
    const message = await client.messages.create({
      from,
      to,
      body,
    });

    console.log("SMS sent:", message.sid);
    return true;
  } catch (error) {
    console.error("Twilio SMS Error:", error.message);
    return false;
  }
};

module.exports = {
  sendSMS,
  genrateOtp,
};
