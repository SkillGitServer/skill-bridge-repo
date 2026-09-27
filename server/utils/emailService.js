const { 
  sendEmail, 
  sendStudentOtpEmail, 
  sendAdminResetOtpEmail,
  sendContactInquiryEmail 
} = require('./sendEmail');

module.exports = {
  sendEmail,
  sendOtpEmail: sendStudentOtpEmail,
  sendStudentOtpEmail,
  sendAdminResetOtpEmail,
  sendContactInquiryEmail
};
