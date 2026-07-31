const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, STELLAR_ADDRESS_PATTERN } = require('../constants');

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true, select: false },
    walletAddress: {
      type: String,
      trim: true,
      default: null,
      // Stellar/Soroban public keys are 56-char base32 strings starting with G.
      match: [STELLAR_ADDRESS_PATTERN, 'Invalid Stellar public key'],
    },
    role: { type: String, enum: USER_ROLES, default: 'freelancer' },
    avatarUrl: { type: String, default: null },
    bio: { type: String, maxlength: 500, default: '' },
    skills: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

userSchema.index({ walletAddress: 1 }, { sparse: true });

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
