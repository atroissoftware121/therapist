  const axios = require('axios');
  const qs = require('qs');
  const { EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_SENDER_ID } = require('../config/index');

  const sendSms = async (to, body) => {
    console.log(EXOTEL_SID, EXOTEL_TOKEN, EXOTEL_SENDER_ID )
    const data = qs.stringify({
      From: EXOTEL_SENDER_ID,
      To: to,
      Body: body,
    });

    const config = {
      method: 'post',
      url: `https://api.exotel.com/v1/Accounts/${EXOTEL_SID}/Sms/send`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${EXOTEL_SID}:${EXOTEL_TOKEN}`).toString('base64'),
      },
      data: data,
    };
    try {
      const response = await axios(config);
      console.log('SMS sent successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending SMS:', error.response ? error.response.data : error.message);
      return error.message;
    }
  };

  module.exports = { sendSms };
