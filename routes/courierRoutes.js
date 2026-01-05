// backend/routes/courierRoutes.js - Courier API Routes
import express from "express";
import {
  bookCourierForOrder,
  cancelCourierBooking,
  courierStatusWebhook,
  getCourierDetails
} from "../controllers/courierController.js";

const router = express.Router();

// ========================================
// COURIER BOOKING ROUTES
// ========================================

/**
 * @route   POST /api/courier/book/:orderId
 * @desc    Book courier for an order
 * @access  Admin
 * @body    { weight, courierName?, awbNumber?, trackingUrl? }
 * 
 * For Tamil Nadu orders:
 *   - Only weight is required
 *   - ST Courier API will be called automatically
 * 
 * For Non-Tamil Nadu orders:
 *   - weight (optional), courierName, awbNumber are required
 *   - Manual entry for other couriers
 */
router.post("/book/:orderId", bookCourierForOrder);

/**
 * @route   POST /api/courier/cancel/:orderId
 * @desc    Cancel courier booking for an order
 * @access  Admin
 * 
 * For Tamil Nadu orders:
 *   - Calls ST Courier cancellation API
 * 
 * For Non-Tamil Nadu orders:
 *   - Updates booking status to cancelled
 */
router.post("/cancel/:orderId", cancelCourierBooking);

// ========================================
// COURIER TRACKING ROUTES
// ========================================

/**
 * @route   GET /api/courier/details/:orderId
 * @desc    Get courier details for an order
 * @access  Admin & Customer
 * @returns { courierDetails: { courierName, awbNumber, trackingUrl, bookingStatus, courierStatusHistory } }
 */
router.get("/details/:orderId", getCourierDetails);

// ========================================
// WEBHOOK ROUTE (ST Courier Status Updates)
// ========================================

/**
 * @route   POST /api/courier/webhook
 * @desc    Receive status updates from ST Courier
 * @access  Public (ST Courier service)
 * @body    { apiData: [{ awbno, trans_dtm, trans_for, trans_from, trans_to, status_code, ... }] }
 * 
 * This endpoint receives automatic status updates from ST Courier
 * and updates the order status accordingly.
 * 
 * Status Codes:
 *   - BK: Booked
 *   - INT: In Transit → Updates order to "Shipped"
 *   - DRS: Out for Delivery → Updates order to "Out for Delivery"
 *   - DLV: Delivered → Updates order to "Delivered"
 *   - UD: Undelivered
 *   - RTO: Return to Origin
 */
router.post("/webhook", courierStatusWebhook);

export default router;  