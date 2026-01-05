// middleware/adminMiddleware.js - FIXED VERSION with proper logging
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';

export const protectAdmin = async (req, res, next) => {
  try {
    let token;

    console.log("🔐 Admin Middleware - Checking authorization");
    console.log("📋 Headers:", req.headers.authorization ? "Present" : "Missing");

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
      console.log("✅ Token found:", token ? "Yes" : "No");
    }

    if (!token) {
      console.log("❌ No token provided in request");
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token provided',
      });
    }

    try {
      // Verify token
      console.log("🔍 Verifying JWT token...");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token decoded successfully:", { id: decoded.id });

      // Get admin from token (exclude password and OTP fields)
      const admin = await Admin.findById(decoded.id).select('-password -otp -otpExpiry');
      console.log("🔍 Admin lookup result:", admin ? `Found: ${admin.name} (${admin.phone})` : "Not found");

      if (!admin) {
        console.log("❌ Admin not found in database");
        return res.status(401).json({
          success: false,
          message: 'Admin not found or token invalid',
        });
      }

      // Check if user is actually an admin
      if (!admin.isAdmin) {
        console.log("❌ User is not an admin:", admin.phone);
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.',
        });
      }

      // Attach admin to request
      req.user = admin;
      console.log("✅ Admin authenticated successfully:", admin.name);

      next(); // Continue to next middleware/route
    } catch (jwtError) {
      console.error('❌ JWT Verification Error:', jwtError.message);
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
        });
      } else if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired, please login again',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed',
      });
    }
  } catch (error) {
    console.error('❌ Admin Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export default { protectAdmin };