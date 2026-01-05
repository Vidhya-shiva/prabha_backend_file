// backend/controllers/courierController.js - Courier API Endpoints
import Order from "../models/Order.js";
import { bookSTCourier, cancelSTBooking, isSTCourierAvailable } from "../services/courierService.js";

// ========================================
// 1. Book Courier for an Order
// ========================================
export const bookCourierForOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { weight, courierName, awbNumber, trackingUrl } = req.body;

    console.log("📦 [Courier Controller] Booking request received");
    console.log("   Order ID:", orderId);
    console.log("   Weight:", weight);

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Check if already booked
    if (order.courierDetails?.bookingStatus === "booked") {
      return res.status(400).json({ 
        success: false, 
        message: "Courier already booked for this order",
        awbNumber: order.courierDetails.awbNumber
      });
    }

    // Check if order is eligible (Tamil Nadu)
    const isTamilNadu = isSTCourierAvailable(order.shippingAddress);

    // ========================================
    // TAMIL NADU: Auto-book with ST Courier
    // ========================================
    if (isTamilNadu) {
      console.log("✅ [Courier Controller] Tamil Nadu order - Booking with ST Courier");

      // Validate weight
      if (!weight || weight <= 0) {
        return res.status(400).json({ 
          success: false, 
          message: "Valid weight is required for ST Courier booking" 
        });
      }

      try {
        // Call ST Courier booking service
        const bookingResult = await bookSTCourier(order, weight);

        if (bookingResult.success) {
          // Update order with courier details
          order.courierDetails = {
            courierName: bookingResult.courierName,
            awbNumber: bookingResult.awbNumber,
            trackingUrl: bookingResult.trackingUrl,
            bookingStatus: "booked",
            bookingResponse: bookingResult.fullResponse,
            weight: weight.toString(),
            volumetricWeight: bookingResult.fullResponse?.volweight || "",
            courierStatusHistory: [{
              status: "Booked",
              timestamp: new Date(),
              location: "PRABHA TEX - Pongalur",
              remarks: "Consignment booked successfully"
            }]
          };

          // Add status history entry
          order.statusHistory.push({
            status: order.status,
            timestamp: new Date(),
            note: `Courier booked - AWB: ${bookingResult.awbNumber}`
          });

          await order.save();

          console.log("✅ [Courier Controller] ST Courier booking successful");
          console.log("   AWB Number:", bookingResult.awbNumber);

          return res.status(200).json({
            success: true,
            message: "ST Courier booked successfully",
            courierDetails: {
              courierName: bookingResult.courierName,
              awbNumber: bookingResult.awbNumber,
              trackingUrl: bookingResult.trackingUrl,
              bookingStatus: "booked"
            }
          });
        } else {
          throw new Error(bookingResult.message || "Booking failed");
        }

      } catch (bookingError) {
        console.error("❌ [Courier Controller] ST Courier booking failed:", bookingError.message);

        // Update order with failed status
        order.courierDetails = {
          courierName: "ST Courier",
          awbNumber: "",
          trackingUrl: "",
          bookingStatus: "failed",
          bookingResponse: { error: bookingError.message },
          weight: weight.toString(),
          volumetricWeight: "",
          courierStatusHistory: [{
            status: "Booking Failed",
            timestamp: new Date(),
            location: "System",
            remarks: bookingError.message
          }]
        };

        await order.save();

        return res.status(500).json({
          success: false,
          message: `ST Courier booking failed: ${bookingError.message}`,
          error: bookingError.message
        });
      }
    } 
    
    // ========================================
    // NON-TAMIL NADU: Manual Courier Entry
    // ========================================
    else {
      console.log("📝 [Courier Controller] Non-Tamil Nadu order - Manual entry");

      // Validate manual entry fields
      if (!courierName || !courierName.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: "Courier name is required for non-Tamil Nadu orders" 
        });
      }

      if (!awbNumber || !awbNumber.trim()) {
        return res.status(400).json({ 
          success: false, 
          message: "AWB/Tracking number is required" 
        });
      }

      // Update order with manual courier details
      order.courierDetails = {
        courierName: courierName.trim(),
        awbNumber: awbNumber.trim(),
        trackingUrl: trackingUrl?.trim() || "",
        bookingStatus: "booked",
        bookingResponse: { manual: true },
        weight: weight?.toString() || "",
        volumetricWeight: "",
        courierStatusHistory: [{
          status: "Manually Added",
          timestamp: new Date(),
          location: "Admin Panel",
          remarks: "Tracking details added manually"
        }]
      };

      // Add status history entry
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date(),
        note: `Manual courier added - ${courierName}: ${awbNumber}`
      });

      await order.save();

      console.log("✅ [Courier Controller] Manual courier details added");
      console.log("   Courier:", courierName);
      console.log("   AWB:", awbNumber);

      return res.status(200).json({
        success: true,
        message: "Courier details added successfully",
        courierDetails: {
          courierName: courierName.trim(),
          awbNumber: awbNumber.trim(),
          trackingUrl: trackingUrl?.trim() || "",
          bookingStatus: "booked"
        }
      });
    }

  } catch (error) {
    console.error("❌ [Courier Controller] Booking error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to book courier", 
      error: error.message 
    });
  }
};

// ========================================
// 2. Cancel Courier Booking
// ========================================
export const cancelCourierBooking = async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log("🚫 [Courier Controller] Cancel request received");
    console.log("   Order ID:", orderId);

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    // Check if courier is booked
    if (!order.courierDetails?.awbNumber) {
      return res.status(400).json({ 
        success: false, 
        message: "No courier booking found for this order" 
      });
    }

    // Check if already cancelled
    if (order.courierDetails?.bookingStatus === "cancelled") {
      return res.status(400).json({ 
        success: false, 
        message: "Courier booking already cancelled" 
      });
    }

    const awbNumber = order.courierDetails.awbNumber;
    const isTamilNadu = isSTCourierAvailable(order.shippingAddress);

    // ========================================
    // TAMIL NADU: Cancel with ST Courier API
    // ========================================
    if (isTamilNadu && order.courierDetails.courierName === "ST Courier") {
      console.log("🚫 [Courier Controller] Cancelling ST Courier booking");
      console.log("   AWB:", awbNumber);

      try {
        // Call ST Courier cancellation service
        const cancelResult = await cancelSTBooking(awbNumber, orderId);

        if (cancelResult.success) {
          // Update order courier details
          order.courierDetails.bookingStatus = "cancelled";
          order.courierDetails.courierStatusHistory.push({
            status: "Cancelled",
            timestamp: new Date(),
            location: "System",
            remarks: "Booking cancelled via API"
          });

          // Add status history entry
          order.statusHistory.push({
            status: order.status,
            timestamp: new Date(),
            note: `Courier booking cancelled - AWB: ${awbNumber}`
          });

          await order.save();

          console.log("✅ [Courier Controller] ST Courier cancellation successful");

          return res.status(200).json({
            success: true,
            message: "ST Courier booking cancelled successfully",
            awbNumber: awbNumber
          });
        } else {
          throw new Error(cancelResult.message || "Cancellation failed");
        }

      } catch (cancelError) {
        console.error("❌ [Courier Controller] ST Courier cancellation failed:", cancelError.message);

        return res.status(500).json({
          success: false,
          message: `ST Courier cancellation failed: ${cancelError.message}`,
          error: cancelError.message
        });
      }
    } 
    
    // ========================================
    // NON-TAMIL NADU: Manual Cancellation
    // ========================================
    else {
      console.log("📝 [Courier Controller] Manual cancellation");

      // Update order courier details
      order.courierDetails.bookingStatus = "cancelled";
      order.courierDetails.courierStatusHistory.push({
        status: "Cancelled",
        timestamp: new Date(),
        location: "Admin Panel",
        remarks: "Booking cancelled manually"
      });

      // Add status history entry
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date(),
        note: `Courier booking cancelled - ${order.courierDetails.courierName}: ${awbNumber}`
      });

      await order.save();

      console.log("✅ [Courier Controller] Manual cancellation successful");

      return res.status(200).json({
        success: true,
        message: "Courier booking cancelled successfully",
        awbNumber: awbNumber
      });
    }

  } catch (error) {
    console.error("❌ [Courier Controller] Cancellation error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to cancel courier booking", 
      error: error.message 
    });
  }
};

// ========================================
// 3. Webhook to Receive Status Updates
// ========================================
export const courierStatusWebhook = async (req, res) => {
  try {
    console.log("📨 [Courier Webhook] Status update received");
    console.log("   Payload:", JSON.stringify(req.body, null, 2));

    const { apiData } = req.body;

    if (!apiData || !Array.isArray(apiData)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid webhook payload" 
      });
    }

    // Process each status update
    for (const statusUpdate of apiData) {
      const { awbno, trans_dtm, trans_for, trans_from, trans_to, delv_staff, status_code, pod_image } = statusUpdate;

      console.log(`📦 Processing AWB: ${awbno} - Status: ${status_code}`);

      // Find order by AWB number
      const order = await Order.findOne({ "courierDetails.awbNumber": awbno });

      if (!order) {
        console.log(`⚠️  Order not found for AWB: ${awbno}`);
        continue;
      }

      // Add status to courier history
      order.courierDetails.courierStatusHistory.push({
        status: trans_for,
        timestamp: new Date(trans_dtm),
        location: `${trans_from} → ${trans_to}`,
        remarks: delv_staff ? `Staff: ${delv_staff}` : status_code
      });

      // Update order status based on courier status code
      if (status_code === "DLV") {
        // Delivered
        order.status = "Delivered";
        order.statusHistory.push({
          status: "Delivered",
          timestamp: new Date(trans_dtm),
          note: `Delivered via ST Courier - AWB: ${awbno}`
        });
      } else if (status_code === "DRS") {
        // Out for Delivery
        if (order.status !== "Delivered") {
          order.status = "Out for Delivery";
          order.statusHistory.push({
            status: "Out for Delivery",
            timestamp: new Date(trans_dtm),
            note: `Out for delivery - AWB: ${awbno}`
          });
        }
      } else if (status_code === "INT") {
        // In Transit
        if (order.status === "Confirmed" || order.status === "Packed") {
          order.status = "Shipped";
          order.statusHistory.push({
            status: "Shipped",
            timestamp: new Date(trans_dtm),
            note: `In transit - AWB: ${awbno}`
          });
        }
      }

      await order.save();
      console.log(`✅ Status updated for order: ${order.orderId}`);
    }

    // Respond to ST Courier webhook
    res.status(200).json({ 
      success: true, 
      message: "Status updates processed successfully" 
    });

  } catch (error) {
    console.error("❌ [Courier Webhook] Error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process status updates", 
      error: error.message 
    });
  }
};

// ========================================
// 4. Get Courier Details for an Order
// ========================================
export const getCourierDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ orderId }).select('courierDetails orderId');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: "Order not found" 
      });
    }

    res.status(200).json({
      success: true,
      courierDetails: order.courierDetails || null
    });

  } catch (error) {
    console.error("❌ [Courier Controller] Get details error:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get courier details", 
      error: error.message 
    });
  }
};