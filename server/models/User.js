const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'student', 'visitor'],
    default: 'visitor'
  },
  status: {
    type: String,
    enum: ['active', 'suspended'],
    default: 'active'
  },
  trialExpiresAt: {
    type: Date
  },
  isUnlocked: {
    type: Boolean,
    default: false
  },
  docGrade10: {
    type: String
  },
  docGrade12: {
    type: String
  },
  docResume: {
    type: String
  },
  adminReferralCode: {
    type: String
  }
}, { timestamps: true });

// Pre-save hook to hash password before saving to database
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('User', userSchema);
