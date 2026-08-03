require("dotenv").config();

const PORT = process.env.PORT;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILLO_SMS_NUMBER = process.env.TWILLO_SMS_NUMBER;
const ATLAS_URI = process.env.ATLAS_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGO = process.env.JWT_ALGO;
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const BUCKET_REGION = process.env.AWS_BUCKET_REGION;
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY;
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;
const SMTP_EMAIL = process.env.SMTP_EMAIL;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const RAZOR_API_KEY = process.env.RAZOR_API_KEY;
const RAZOR_API_SECRET = process.env.RAZOR_API_SECRET;
const EXOTEL_SID = process.env.EXOTEL_SID;
const EXOTEL_TOKEN  = process.env.EXOTEL_TOKEN;
const EXOTEL_SENDER_ID =  process.env.EXOTEL_SENDER_ID;
// TEMP: set OTP_BYPASS=true to skip SMS provider & accept any OTP. Set false after Exotel recharge.
const OTP_BYPASS = process.env.OTP_BYPASS === 'true';
module.exports = {
  PORT,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILLO_SMS_NUMBER,
  ATLAS_URI,
  JWT_SECRET,
  JWT_ALGO,
  BUCKET_REGION,
  BUCKET_NAME,
  AWS_ACCESS_KEY,
  AWS_SECRET_KEY,
  SMTP_EMAIL,
  SMTP_PASSWORD,
  FIREBASE_API_KEY,
  RAZOR_API_KEY,
  RAZOR_API_SECRET,
  EXOTEL_SID,
  EXOTEL_TOKEN,
  EXOTEL_SENDER_ID,
  OTP_BYPASS,
};
