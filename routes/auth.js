// routes/auth.js - Step 3: Simplified Routes
import express from 'express';
import {
  // Signup with OTP (Name + Phone only)
  sendSignupOTP,
  verifySignupOTP,
  
  // Login (Phone only - No Password, No OTP)
  login,
  
  // Change Number (Replaces Forgot Password)
  sendChangeNumberOTP,
  verifyAndChangeNumber,
  
  // Profile Management
  getProfile,
  updateProfile,
  checkPhone,

  // Order OTP Verification
  sendOrderOTP,
  verifyOrderOTP,

  // ✅ Recently Viewed Products
  addRecentlyViewed,
  getRecentlyViewed,
} from '../controllers/authController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// ========================
// PUBLIC ROUTES
// ========================

// Signup with OTP (Name + Phone only)
router.post('/send-signup-otp', sendSignupOTP);
router.post('/verify-signup-otp', verifySignupOTP);

// Login (Phone only - Direct, No Password, No OTP)
router.post('/login', login);

// Change Number (Replaces Forgot Password)
router.post('/send-change-number-otp', sendChangeNumberOTP);
router.post('/verify-and-change-number', verifyAndChangeNumber);

// Utility
router.post('/check-phone', checkPhone);

// Order OTP Verification
router.post('/send-order-otp', sendOrderOTP);
router.post('/verify-order-otp', verifyOrderOTP);

// ========================
// PROTECTED ROUTES
// ========================

router.use(protect); // All routes below this are protected

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// ✅ Recently Viewed Products Routes
router.post('/recently-viewed', addRecentlyViewed);
router.get('/recently-viewed', getRecentlyViewed);

export default router;