// controllers/authController.js - Step 2: Simplified Version
import User from "../models/User.js";
import Product from "../models/Product.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import { getPing4SMSConfig } from "../config/authConfig.js";

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
const cleanPhone = (phone) => phone.replace(/\D/g, "");

// Send OTP via Ping4SMS
const sendOTPViaPing4SMS = async (phone, otp, purpose = "verification") => {
  const config = getPing4SMSConfig();
  if (!config) throw new Error("Ping4SMS service not configured");

  try {
    const cleanedPhone = cleanPhone(phone).slice(-10);
    const message = `Dear Customer,${otp} is your verification code -PNGOTP`;
    const apiUrl = `${config.apiUrl}?key=${config.apiKey}&route=${config.route}&sender=${config.senderId}&number=${cleanedPhone}&sms=${encodeURIComponent(message)}&templateid=${config.templateId}`;
    
    console.log("📤 Sending OTP via Ping4SMS to:", cleanedPhone);
    
    const response = await axios.get(apiUrl, { timeout: 10000 });
    console.log("✅ Ping4SMS Response:", response.data);
    
    if (response.data && (response.data.status === "success" || response.data.ErrorCode === "000")) {
      return { success: true, messageId: response.data.MessageID || "sent" };
    } else {
      throw new Error(response.data?.ErrorMessage || "Failed to send SMS");
    }
  } catch (error) {
    console.error("❌ Ping4SMS Error:", error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

// Generic OTP send handler
const handleOTPSend = async (res, phone, otp, purpose) => {
  try {
    await sendOTPViaPing4SMS(phone, otp, purpose);
    res.status(200).json({ success: true, message: "OTP sent successfully to your phone" });
  } catch (smsError) {
    res.status(200).json({
      success: true,
      message: `OTP generated: ${otp} (SMS failed - ${smsError.message})`,
      ...(process.env.NODE_ENV === "development" && { otp }),
    });
  }
};

// ==========================================
// 1. SIGNUP - Send OTP (Name + Phone only)
// ==========================================
export const sendSignupOTP = async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const userExists = await User.findOne({ phone: cleanPhone(phone) });
    if (userExists) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }

    const otp = generateOTP();
    const tempUser = new User({
      phone: cleanPhone(phone),
      name: name.trim(),
      otp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      isPhoneVerified: false,
    });

    await tempUser.save();
    await handleOTPSend(res, phone, otp, "signup");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 2. SIGNUP - Verify OTP
// ==========================================
export const verifySignupOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const user = await User.findOne({ phone: cleanPhone(phone), isPhoneVerified: false }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "No signup request found. Please start signup again." });
    }
    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP requested or OTP expired" });
    }
    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    user.isPhoneVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: "Signup successful",
      data: { id: user._id, name: user.name, phone: user.phone, isPhoneVerified: user.isPhoneVerified, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 3. LOGIN - Direct with Phone only (No OTP, No Password)
// ==========================================
export const login = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const user = await User.findOne({ phone: cleanPhone(phone), isPhoneVerified: true });
    if (!user) {
      return res.status(401).json({ success: false, message: "Phone number not registered or not verified" });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { id: user._id, name: user.name, phone: user.phone, isPhoneVerified: user.isPhoneVerified, token },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to login. Please try again.", error: error.message });
  }
};

// ==========================================
// 4. CHANGE NUMBER - Step 1: Send OTP to Current Number
// ==========================================
export const sendChangeNumberOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const user = await User.findOne({ phone: cleanPhone(phone), isPhoneVerified: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "Phone number not registered" });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();

    await handleOTPSend(res, phone, otp, "change number");
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 5. CHANGE NUMBER - Step 2: Verify OTP and Change Number
// ==========================================
export const verifyAndChangeNumber = async (req, res) => {
  try {
    const { phone, otp, newPhone } = req.body;

    if (!phone || !otp || !newPhone) {
      return res.status(400).json({ success: false, message: "Phone, OTP, and new phone number are required" });
    }
    if (!isValidPhone(phone) || !isValidPhone(newPhone)) {
      return res.status(400).json({ success: false, message: "Please provide valid 10-digit Indian phone numbers" });
    }
    if (cleanPhone(phone) === cleanPhone(newPhone)) {
      return res.status(400).json({ success: false, message: "New phone number must be different from current number" });
    }

    // Check if new phone already exists
    const existingUser = await User.findOne({ phone: cleanPhone(newPhone) });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "New phone number already registered" });
    }

    // Verify OTP
    const user = await User.findOne({ phone: cleanPhone(phone) }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    // Change phone number
    user.phone = cleanPhone(newPhone);
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: "Phone number changed successfully",
      data: { id: user._id, name: user.name, phone: user.phone, isPhoneVerified: user.isPhoneVerified, token },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "New phone number already registered" });
    }
    res.status(500).json({ success: false, message: "Failed to change phone number. Please try again.", error: error.message });
  }
};

// ==========================================
// 6. PROFILE MANAGEMENT
// ==========================================
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-otp -otpExpiry");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get profile", error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { name: name.trim() }, 
      { new: true, runValidators: true }
    ).select("-otp -otpExpiry");
    
    res.status(200).json({ success: true, message: "Profile updated successfully", data: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
};

export const checkPhone = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const userExists = await User.findOne({ phone: cleanPhone(phone) });
    res.status(200).json({ success: true, data: { available: !userExists } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to check phone availability", error: error.message });
  }
};

// ==========================================
// 7. ORDER OTP (Keep as it was)
// ==========================================
export const sendOrderOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const user = await User.findOne({ phone: cleanPhone(phone) });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found. Please login first." });
    }

    const otp = generateOTP();
    await User.findOneAndUpdate({ _id: user._id }, { otp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) });
    await handleOTPSend(res, phone, otp, "order verification");
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to send order verification OTP. Please try again.", error: error.message });
  }
};

export const verifyOrderOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }

    const user = await User.findOne({ phone: cleanPhone(phone) }).select("+otp +otpExpiry");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({ success: true, message: "Order OTP verified successfully. You can now proceed with payment." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify order OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// ✅ 8. RECENTLY VIEWED - Add Product View
// ==========================================
export const addRecentlyViewed = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({ 
        success: false, 
        message: "Product ID is required" 
      });
    }

    console.log('➕ [ADD] Adding product', productId, 'for user', userId);

    // ✅ STEP 1: Verify product exists (FAST with exists())
    const productExists = await Product.exists({ 
      id: productId, 
      isActive: true 
    });

    if (!productExists) {
      console.log('❌ [ADD] Product not found or inactive');
      return res.status(404).json({ 
        success: false, 
        message: "Product not found" 
      });
    }

    // ✅ STEP 2: Remove if already exists
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { recentlyViewed: { productId } }
      }
    );

    // ✅ STEP 3: Add to front and keep only last 50
    await User.findByIdAndUpdate(
      userId,
      {
        $push: { 
          recentlyViewed: { 
            $each: [{ productId, viewedAt: new Date() }],
            $position: 0, // Add to beginning
            $slice: 50 // Keep only last 50 items
          } 
        }
      }
    );

    console.log('✅ [ADD] Product added to recently viewed');

    res.status(200).json({ 
      success: true, 
      message: "Product added to recently viewed" 
    });
  } catch (error) {
    console.error("❌ [ADD] Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to add recently viewed", 
      error: error.message 
    });
  }
};

// ==========================================
// ✅ 9. RECENTLY VIEWED - Get Products
// ==========================================

export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user.id;
    const startTime = Date.now();
    
    console.log('📡 [GET] Starting fetch for user:', userId);

    const user = await User.findById(userId).select('recentlyViewed').lean();
    
    if (!user?.recentlyViewed?.length) {
      console.log('✅ [GET] No products - ', Date.now() - startTime, 'ms');
      return res.json({ success: true, products: [] });
    }

    const productIds = user.recentlyViewed.slice(0, 20).map(i => i.productId);
    console.log('🔍 [GET] IDs:', productIds);

    const products = await Product.find({ 
      id: { $in: productIds },
      isActive: true 
    })
    .select('id title price sellingPrice discount stock collection colorImages stockDetails')
    .lean();
    
    console.log('📦 [GET] Found', products.length, 'products');

    const map = new Map(products.map(p => [p.id, p]));
    const sorted = productIds.map(id => map.get(id)).filter(Boolean);
    
    console.log('✅ [GET] Done in', Date.now() - startTime, 'ms');

    res.json({ success: true, products: sorted });
  } catch (error) {
    console.error('❌ [GET] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};