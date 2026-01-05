// models/User.js - OPTIMIZED VERSION (PERMANENT FIX)
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[6-9]\d{9}$/.test(v);
      },
      message: 'Please enter a valid 10-digit Indian phone number'
    }
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    select: false
  },
  otpExpiry: {
    type: Date,
    select: false
  },
  // ✅ OPTIMIZED: Recently Viewed with nested structure
  recentlyViewed: [{
    productId: { 
      type: String, 
      required: true,
      index: true // ✅ INDEX for faster queries
    },
    viewedAt: { 
      type: Date, 
      default: Date.now,
      index: true // ✅ INDEX for sorting
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ COMPOUND INDEXES for performance
userSchema.index({ phone: 1 });
userSchema.index({ 'recentlyViewed.productId': 1 });
userSchema.index({ 'recentlyViewed.viewedAt': -1 });

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if OTP is valid
userSchema.methods.isOTPValid = function () {
  return this.otpExpiry && new Date() < this.otpExpiry;
};

export default mongoose.model('User', userSchema);