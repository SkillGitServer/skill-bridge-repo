const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  studentEmail: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  // Razorpay transaction tracking
  razorpayOrderId: {
    type: String,
    default: ''
  },
  razorpayPaymentId: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
