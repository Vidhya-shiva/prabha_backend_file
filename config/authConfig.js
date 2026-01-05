// config/authConfig.js - ENHANCED PING4SMS CONFIGURATION
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

let ping4smsConfig = null;

const initializePing4SMS = () => {
  try {
    console.log("🔑 Initializing Ping4SMS configuration");

    // Validate all required credentials
    const requiredVars = {
      'PING4SMS_API_KEY': process.env.PING4SMS_API_KEY,
      'PING4SMS_SENDER_ID': process.env.PING4SMS_SENDER_ID,
      'PING4SMS_TEMPLATE_ID': process.env.PING4SMS_TEMPLATE_ID
    };

    const missingVars = Object.entries(requiredVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      console.error("❌ Missing Ping4SMS credentials:", missingVars.join(', '));
      throw new Error(`Ping4SMS credentials not configured: ${missingVars.join(', ')}`);
    }

    ping4smsConfig = {
      apiKey: process.env.PING4SMS_API_KEY.trim(),
      senderId: process.env.PING4SMS_SENDER_ID.trim(),
      templateId: process.env.PING4SMS_TEMPLATE_ID.trim(),
      route: process.env.PING4SMS_ROUTE?.trim() || '2',
      apiUrl: process.env.PING4SMS_API_URL?.trim() || 'https://site.ping4sms.com/api/smsapi'
    };

    // Validate API URL format
    try {
      new URL(ping4smsConfig.apiUrl);
    } catch (error) {
      console.error("❌ Invalid Ping4SMS API URL:", ping4smsConfig.apiUrl);
      throw new Error("Invalid Ping4SMS API URL format");
    }

    // Validate API Key length (basic check)
    if (ping4smsConfig.apiKey.length < 20) {
      console.warn("⚠️ Ping4SMS API Key seems too short, please verify");
    }

    console.log("✅ Ping4SMS configuration initialized successfully");
    console.log("📱 Sender ID:", ping4smsConfig.senderId);
    console.log("📋 Template ID:", ping4smsConfig.templateId);
    console.log("🚦 Route:", ping4smsConfig.route);
    console.log("🔗 API URL:", ping4smsConfig.apiUrl);
    console.log("🔑 API Key:", ping4smsConfig.apiKey.substring(0, 8) + '...' + ping4smsConfig.apiKey.substring(ping4smsConfig.apiKey.length - 4));
    
    return ping4smsConfig;
  } catch (error) {
    console.error("❌ Ping4SMS initialization failed:", error.message);
    ping4smsConfig = null;
    return null;
  }
};

// Initialize Ping4SMS immediately
initializePing4SMS();

const getPing4SMSConfig = () => {
  if (!ping4smsConfig) {
    console.warn("⚠️ Ping4SMS not initialized, attempting to initialize now...");
    return initializePing4SMS();
  }
  return ping4smsConfig;
};

// Test function to verify Ping4SMS configuration (optional)
const testPing4SMSConfig = () => {
  const config = getPing4SMSConfig();
  
  if (!config) {
    return {
      status: 'error',
      message: 'Ping4SMS configuration not initialized'
    };
  }

  return {
    status: 'success',
    message: 'Ping4SMS configuration is valid',
    config: {
      senderId: config.senderId,
      templateId: config.templateId,
      route: config.route,
      apiUrl: config.apiUrl,
      apiKeyPresent: !!config.apiKey
    }
  };
};

export { initializePing4SMS, getPing4SMSConfig, testPing4SMSConfig };