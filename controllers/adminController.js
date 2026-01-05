// controllers/adminController.js - FIXED VERSION with proper logging
import Admin from "../models/Admin.js";
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
    
    console.log("📤 Sending Admin OTP via Ping4SMS to:", cleanedPhone);
    
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
// 1. ADMIN SIGNUP - Send OTP
// ==========================================
export const sendAdminSignupOTP = async (req, res) => {
  try {
    const { phone, name, password } = req.body;
    console.log("📝 Admin Signup OTP Request:", { phone, name, hasPassword: !!password });

    if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const adminExists = await Admin.findOne({ phone: cleanPhone(phone) });
    if (adminExists) {
      console.log("❌ Admin already exists:", phone);
      return res.status(409).json({ success: false, message: "Phone number already registered as admin" });
    }

    const otp = generateOTP();
    const tempAdmin = new Admin({
      phone: cleanPhone(phone),
      name: name.trim(),
      password,
      otp,
      otpExpiry: new Date(Date.now() + 5 * 60 * 1000),
      isPhoneVerified: false,
    });

    await tempAdmin.save();
    console.log("✅ Temporary admin created:", phone);
    
    await handleOTPSend(res, phone, otp, "admin signup");
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Phone number already registered" });
    }
    console.error("❌ Admin signup OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 2. ADMIN SIGNUP - Verify OTP
// ==========================================
export const verifyAdminSignupOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    console.log("🔍 Admin Signup Verify OTP Request:", { phone, otp });

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: "Phone and OTP are required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const admin = await Admin.findOne({ phone: cleanPhone(phone), isPhoneVerified: false }).select("+otp +otpExpiry");
    if (!admin) {
      console.log("❌ No pending admin signup found for:", phone);
      return res.status(404).json({ success: false, message: "No signup request found. Please start signup again." });
    }
    if (!admin.otp || !admin.otpExpiry) {
      return res.status(400).json({ success: false, message: "No OTP requested or OTP expired" });
    }
    if (admin.otp !== otp) {
      console.log("❌ Invalid OTP provided for:", phone);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (new Date() > admin.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    admin.isPhoneVerified = true;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    const token = generateToken(admin._id);
    
    const responseData = { 
      id: admin._id, 
      name: admin.name, 
      phone: admin.phone, 
      isAdmin: admin.isAdmin,
      isPhoneVerified: admin.isPhoneVerified, 
      token 
    };
    
    console.log("✅ Admin signup successful:", responseData);
    
    res.status(201).json({
      success: true,
      message: "Admin signup successful",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Admin signup verify error:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 3. ADMIN LOGIN - Phone + Password
// ==========================================
export const adminLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log("🔐 Admin Login Request:", { phone, hasPassword: !!password });

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    // Find admin and include password for verification
    const admin = await Admin.findOne({ phone: cleanPhone(phone), isPhoneVerified: true }).select("+password");
    if (!admin) {
      console.log("❌ Admin not found or not verified:", phone);
      return res.status(401).json({ success: false, message: "Invalid phone number or password" });
    }

    // Check password
    const isPasswordCorrect = await admin.matchPassword(password);
    if (!isPasswordCorrect) {
      console.log("❌ Invalid password for admin:", phone);
      return res.status(401).json({ success: false, message: "Invalid phone number or password" });
    }

    const token = generateToken(admin._id);
    
    const responseData = { 
      id: admin._id, 
      name: admin.name, 
      phone: admin.phone, 
      isAdmin: admin.isAdmin,
      isPhoneVerified: admin.isPhoneVerified, 
      token 
    };
    
    console.log("✅ Admin login successful:", responseData);
    
    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: responseData,
    });
  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ success: false, message: "Failed to login. Please try again.", error: error.message });
  }
};

// ==========================================
// 4. ADMIN FORGOT PASSWORD - Send OTP
// ==========================================
export const sendAdminForgetPasswordOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    console.log("📝 Admin Forgot Password OTP Request:", phone);

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }

    const admin = await Admin.findOne({ phone: cleanPhone(phone), isPhoneVerified: true });
    if (!admin) {
      console.log("❌ Admin not found:", phone);
      return res.status(404).json({ success: false, message: "Admin not found with this phone number" });
    }

    const otp = generateOTP();
    admin.otp = otp;
    admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await admin.save();

    console.log("✅ OTP generated for admin:", phone);
    await handleOTPSend(res, phone, otp, "admin forgot password");
  } catch (error) {
    console.error("❌ Admin forgot password OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 5. ADMIN FORGOT PASSWORD - Verify OTP and Reset
// ==========================================
export const verifyAdminForgetPasswordOTP = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    console.log("🔍 Admin Forgot Password Verify Request:", { phone, otp });

    if (!phone || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: "Phone, OTP, and new password are required" });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: "Please provide a valid 10-digit Indian phone number" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const admin = await Admin.findOne({ phone: cleanPhone(phone) }).select("+otp +otpExpiry +password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    if (!admin.otp || admin.otp !== otp) {
      console.log("❌ Invalid OTP for password reset:", phone);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (!admin.otpExpiry || new Date() > admin.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    // Update password (will be hashed by pre-save hook)
    admin.password = newPassword;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    console.log("✅ Admin password reset successful:", phone);
    res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("❌ Admin reset password error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password. Please try again.", error: error.message });
  }
};

// ==========================================
// 6. ADMIN CHANGE PASSWORD - Send OTP (Protected)
// ==========================================
export const sendAdminChangePasswordOTP = async (req, res) => {
  try {
    const adminId = req.user.id;
    console.log("📝 Admin Change Password OTP Request for ID:", adminId);

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    const otp = generateOTP();
    admin.otp = otp;
    admin.otpExpiry = new Date(Date.now() + 5 * 60 * 1000);
    await admin.save();

    console.log("✅ Change password OTP generated for:", admin.phone);
    await handleOTPSend(res, admin.phone, otp, "admin change password");
  } catch (error) {
    console.error("❌ Admin change password OTP error:", error);
    res.status(500).json({ success: false, message: "Failed to send OTP. Please try again.", error: error.message });
  }
};

// ==========================================
// 7. ADMIN CHANGE PASSWORD - Verify OTP and Change (Protected)
// ==========================================
export const verifyAdminChangePasswordOTP = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { otp, newPassword } = req.body;
    console.log("🔍 Admin Change Password Verify Request for ID:", adminId);

    if (!otp || !newPassword) {
      return res.status(400).json({ success: false, message: "OTP and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    }

    const admin = await Admin.findById(adminId).select("+otp +otpExpiry +password");
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }
    if (!admin.otp || admin.otp !== otp) {
      console.log("❌ Invalid OTP for password change");
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }
    if (!admin.otpExpiry || new Date() > admin.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    // Update password (will be hashed by pre-save hook)
    admin.password = newPassword;
    admin.otp = undefined;
    admin.otpExpiry = undefined;
    await admin.save();

    console.log("✅ Admin password changed successfully:", admin.phone);
    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Admin verify change password error:", error);
    res.status(500).json({ success: false, message: "Failed to change password. Please try again.", error: error.message });
  }
};

// ==========================================
// 8. GET ADMIN PROFILE (Protected)
// ==========================================
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-otp -otpExpiry -password");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    
    console.log("✅ Admin profile retrieved:", admin.phone);
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    console.error("❌ Get admin profile error:", error);
    res.status(500).json({ success: false, message: "Failed to get profile", error: error.message });
  }
};