// routes/adminAuth.js - Admin Authentication Routes
import express from 'express';
import {
  // Admin Signup with OTP
  sendAdminSignupOTP,
  verifyAdminSignupOTP,
  
  // Admin Login (Phone + Password)
  adminLogin,
  
  // Admin Forgot Password
  sendAdminForgetPasswordOTP,
  verifyAdminForgetPasswordOTP,
  
  // Admin Change Password (Protected)
  sendAdminChangePasswordOTP,
  verifyAdminChangePasswordOTP,

  // Admin Profile
  getAdminProfile,
} from '../controllers/adminController.js';

import { protectAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

// ========================
// PUBLIC ROUTES
// ========================

// Admin Signup with OTP
router.post('/send-signup-otp', sendAdminSignupOTP);
router.post('/verify-signup-otp', verifyAdminSignupOTP);

// Admin Login (Phone + Password)
router.post('/login', adminLogin);

// Admin Forgot Password
router.post('/send-forget-password-otp', sendAdminForgetPasswordOTP);
router.post('/verify-forget-password-otp', verifyAdminForgetPasswordOTP);

// ========================
// PROTECTED ROUTES (Admin only)
// ========================

router.use(protectAdmin); // All routes below this are protected

// Admin Change Password
router.post('/send-change-password-otp', sendAdminChangePasswordOTP);
router.post('/verify-change-password-otp', verifyAdminChangePasswordOTP);

// Admin Profile
router.get('/profile', getAdminProfile);

export default router;