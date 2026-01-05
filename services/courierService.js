// backend/services/courierService.js - ST Courier API Integration
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

// ========================================
// ST Courier Configuration
// ========================================
const ST_COURIER_CONFIG = {
  apiUrl: process.env.ST_COURIER_API_URL,
  cancelUrl: process.env.ST_COURIER_CANCEL_URL,
  apiToken: process.env.ST_COURIER_API_TOKEN,
  customerCode: process.env.ST_COURIER_CUSTOMER_CODE,
  sender: {
    name: process.env.ST_COURIER_SENDER_NAME,
    address1: process.env.ST_COURIER_SENDER_ADDRESS1,
    address2: process.env.ST_COURIER_SENDER_ADDRESS2,
    pincode: process.env.ST_COURIER_SENDER_PINCODE,
    phone: process.env.ST_COURIER_SENDER_PHONE,
  }
};

// ========================================
// Helper: Format Phone Number
// ========================================
const formatPhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.slice(-10); // Last 10 digits only
};

// ========================================
// Helper: Calculate Volumetric Weight
// ========================================
const calculateVolumetricWeight = (weight) => {
  // Simple formula: 20% of actual weight
  // You can customize this based on package dimensions
  const volWeight = parseFloat(weight) * 0.2;
  return volWeight.toFixed(2);
};

// ========================================
// Helper: Detect State Category
// ========================================
const detectStateCategory = (state) => {
  if (!state) return 'north';
  const normalizedState = state.toLowerCase().trim();
  
  const tamilNaduVariants = ['tamil nadu', 'tamilnadu', 'tn'];
  if (tamilNaduVariants.some(tn => normalizedState.includes(tn))) {
    return 'tamilnadu';
  }
  
  return 'other';
};

// ========================================
// 1. Book Consignment with ST Courier
// ========================================
export const bookSTCourier = async (orderData, weight) => {
  try {
    console.log("📦 [ST Courier] Booking consignment...");
    console.log("   Order ID:", orderData.orderId);
    console.log("   Weight:", weight, "kg");

    // Validate Tamil Nadu only
    const stateCategory = detectStateCategory(orderData.shippingAddress?.state);
    if (stateCategory !== 'tamilnadu') {
      throw new Error("ST Courier is only available for Tamil Nadu");
    }

    // Validate required data
    if (!orderData || !weight) {
      throw new Error("Order data and weight are required");
    }

    if (!ST_COURIER_CONFIG.apiUrl || !ST_COURIER_CONFIG.apiToken) {
      throw new Error("ST Courier credentials not configured in .env");
    }

    // Prepare booking payload
    const volumetricWeight = calculateVolumetricWeight(weight);
    const receiverPhone = formatPhoneNumber(orderData.userEmail || orderData.customerPhone);
    
    const bookingPayload = [{
      awbno: "AUTO", // ✅ ST Courier will auto-assign AWB number
      refno: orderData.orderId, // Your order ID as reference
      orginsrc: ST_COURIER_CONFIG.customerCode,
      
      // Sender Details (Your shop)
      frmname: ST_COURIER_CONFIG.sender.name,
      frmadd1: ST_COURIER_CONFIG.sender.address1,
      frmadd2: ST_COURIER_CONFIG.sender.address2,
      frmpincode: ST_COURIER_CONFIG.sender.pincode,
      frmphone: ST_COURIER_CONFIG.sender.phone,
      
      // Receiver Details (Customer)
      toname: orderData.userName || "Customer",
      toadd1: orderData.shippingAddress.street || "",
      toadd2: `${orderData.shippingAddress.village || ""}, ${orderData.shippingAddress.po || ""}`,
      toarea: orderData.shippingAddress.district || "",
      topincode: orderData.shippingAddress.pincode || "",
      tophone: receiverPhone,
      
      // Shipment Details
      goodsname: `Saree Order - ${orderData.items?.length || 1} pcs`,
      goodsvalue: orderData.totalAmount?.toString() || "0",
      doctype: "N", // N = Non-Document (physical goods)
      transmode: "S", // S = Surface (default for sarees)
      qty: orderData.items?.reduce((sum, item) => sum + item.quantity, 0)?.toString() || "1",
      weight: weight.toString(),
      volweight: volumetricWeight,
      
      // Payment Details
      topayamt: "0", // No to-pay amount (already paid)
      codamt: orderData.paymentMethod === "cod" ? orderData.totalAmount?.toString() : "0",
      
      // Invoice & E-Way Bill
      invfiletype: "", // Optional: "jpg" or "pdf"
      invcopy: "0", // Optional: Base64 encoded invoice
      ewaybill: "" // Optional: E-Way bill number
    }];

    console.log("📤 [ST Courier] Sending booking request...");
    console.log("   Receiver:", bookingPayload[0].toname);
    console.log("   Pincode:", bookingPayload[0].topincode);

    // Make API call to ST Courier
    const response = await axios.post(
      ST_COURIER_CONFIG.apiUrl,
      bookingPayload,
      {
        headers: {
          'API-TOKEN': ST_COURIER_CONFIG.apiToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log("📥 [ST Courier] Response received:", JSON.stringify(response.data));

    // Parse response
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    
   if (result.status === "1" || result.status === 1) {
      console.log("✅ [ST Courier] Booking successful!");
      console.log("   AWB Number:", result.awbno);
      
      // ✅ FIXED: Correct tracking URL format (added ?awbno= instead of /)
      const trackingUrl = `https://erpstcourier.com/tracking?awbno=${result.awbno}`;
      
      return {
        success: true,
        awbNumber: result.awbno,
        message: result.result || "Booking successful",
        fullResponse: result,
        courierName: "ST Courier",
        trackingUrl: trackingUrl // ✅ Now this will work correctly
      };
    } else {
      console.log("❌ [ST Courier] Booking failed:", result.result);
      throw new Error(result.result || "Booking failed");
    }

  } catch (error) {
    console.error("❌ [ST Courier] Booking error:", error.message);
    
    if (error.response) {
      console.error("   API Response:", error.response.data);
      throw new Error(error.response.data?.result || error.response.data?.message || "ST Courier API error");
    }
    
    throw new Error(error.message || "Failed to book courier");
  }
};

// ========================================
// 2. Cancel ST Courier Booking
// ========================================
export const cancelSTBooking = async (awbNumber, orderId) => {
  try {
    console.log("🚫 [ST Courier] Cancelling booking...");
    console.log("   AWB Number:", awbNumber);
    console.log("   Order ID:", orderId);

    if (!awbNumber) {
      throw new Error("AWB number is required for cancellation");
    }

    if (!ST_COURIER_CONFIG.cancelUrl || !ST_COURIER_CONFIG.apiToken) {
      throw new Error("ST Courier credentials not configured");
    }

    // Prepare cancellation payload
    const cancelPayload = [{
      awbno: awbNumber,
      originsrc: ST_COURIER_CONFIG.customerCode,
      remarks: `Order cancelled - ${orderId}`
    }];

    console.log("📤 [ST Courier] Sending cancellation request...");

    // Make API call to ST Courier
    const response = await axios.post(
      ST_COURIER_CONFIG.cancelUrl,
      cancelPayload,
      {
        headers: {
          'API-TOKEN': ST_COURIER_CONFIG.apiToken,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log("📥 [ST Courier] Cancellation response:", JSON.stringify(response.data));

    // Parse response
    const result = Array.isArray(response.data) ? response.data[0] : response.data;
    
    if (result.status === "1" || result.status === 1) {
      console.log("✅ [ST Courier] Cancellation successful!");
      
      return {
        success: true,
        message: result.result || "Cancellation successful",
        awbNumber: awbNumber
      };
    } else {
      console.log("❌ [ST Courier] Cancellation failed:", result.result);
      throw new Error(result.result || "Cancellation failed");
    }

  } catch (error) {
    console.error("❌ [ST Courier] Cancellation error:", error.message);
    
    if (error.response) {
      console.error("   API Response:", error.response.data);
      throw new Error(error.response.data?.result || "ST Courier cancellation failed");
    }
    
    throw new Error(error.message || "Failed to cancel courier booking");
  }
};

// ========================================
// 3. Validate if ST Courier Available
// ========================================
export const isSTCourierAvailable = (shippingAddress) => {
  const stateCategory = detectStateCategory(shippingAddress?.state);
  return stateCategory === 'tamilnadu';
};

// ========================================
// Export all functions
// ========================================
export default {
  bookSTCourier,
  cancelSTBooking,
  isSTCourierAvailable,
  detectStateCategory
};