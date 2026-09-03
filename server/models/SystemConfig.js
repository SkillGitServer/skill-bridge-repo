const mongoose = require('mongoose');

const systemConfigSchema = new mongoose.Schema({
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockReason: {
    type: String,
    default: ""
  },
  maintenanceMode: {
    type: Boolean,
    default: false
  },
  unlockFee: {
    type: Number,
    default: 99
  },
  defaultStudentDurationMonths: {
    type: Number,
    default: 6
  },
  paymentQrUrl: {
    type: String,
    default: ""
  },
  paymentUrl: {
    type: String,
    default: ""
  },
  upiId: {
    type: String,
    default: ""
  },
  payeeName: {
    type: String,
    default: ""
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
