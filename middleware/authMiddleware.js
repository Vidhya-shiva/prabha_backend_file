// middleware/auth.js - FIXED VERSION
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Check Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔑 Token received:', token ? 'YES' : 'NO');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized - No token provided',
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded:', decoded);

      // Get user from token
      const user = await User.findById(decoded.id).select('-otp -otpExpiry');
      
      console.log('👤 User found:', user ? user._id : 'NOT FOUND');

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found or token invalid',
        });
      }

      // Attach user to request
      req.user = {
        id: user._id,
        _id: user._id,
        name: user.name,
        phone: user.phone
      };

      console.log('✅ User authenticated:', req.user.id);
      next();

    } catch (jwtError) {
      console.error('❌ JWT Error:', jwtError.message);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired - Please login again',
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

  } catch (error) {
    console.error('❌ Auth Middleware Error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: error.message
    });
  }
};

// Alias for compatibility
export const protect = authenticate;

export default { authenticate, protect };