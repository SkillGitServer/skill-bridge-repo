const { sendEmail, sendStudentOtpEmail, sendAdminResetOtpEmail } = require('./sendEmail');

module.exports = {
  sendEmail,
  sendOtpEmail: sendStudentOtpEmail,
  sendStudentOtpEmail,
  sendAdminResetOtpEmail
};
