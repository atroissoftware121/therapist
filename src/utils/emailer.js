const nodemailer = require("nodemailer");
const { SMTP_EMAIL, SMTP_PASSWORD } = require("../config");
const sendEmail = (toEmail, subject, textBody) => {
  try {
    // Create a transporter using Gmail's SMTP server
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Replace with your SMTP server's hostname
      port: 587, // Replace with the SMTP server's port
      secure: false, // Set to true if you're using a secure connection (e.g., port 465)
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    // Email content
    const mailOptions = {
      from: SMTP_EMAIL,
      to: toEmail,
      subject: subject,
      text: textBody,
    };
    console.log(mailOptions);

    // Send the email
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log("Error occurred:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = sendEmail;
