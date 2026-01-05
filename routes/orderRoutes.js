// routes/orderRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  placeOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  createRazorpayOrder,
  verifyRazorpayPayment,
  placeOrderWithPayment,
  getAllOrders,
} from "../controllers/orderController.js";

const router = express.Router();

// ========================================
// PAYMENT ROUTES (No cache needed)
// ========================================
router.post("/create-razorpay-order", createRazorpayOrder);
router.post("/verify-payment", verifyRazorpayPayment);

// ========================================
// ORDER PLACEMENT (Clear cache after placing)
// ========================================
router.post("/place", async (req, res, next) => {
  await placeOrder(req, res, next);
  clearCache('/api/orders/all'); // Clear admin orders cache
});

router.post("/place-with-payment", async (req, res, next) => {
  await placeOrderWithPayment(req, res, next);
  clearCache('/api/orders/all');
});

// ========================================
// ADMIN ROUTES - With Cache
// ========================================
// GET all orders (Admin) - Cache for 2 minutes (orders change frequently)
router.get("/all", cacheMiddleware(120), getAllOrders);

// ========================================
// USER ROUTES (No cache - user-specific data)
// ========================================
router.get("/user/:userId", getUserOrders);
router.get("/:orderId", getOrderById);

// ========================================
// ORDER MANAGEMENT (Clear cache after changes)
// ========================================
router.patch("/:orderId/cancel", async (req, res, next) => {
  await cancelOrder(req, res, next);
  clearCache('/api/orders/all');
});

router.patch("/:orderId/status", async (req, res, next) => {
  await updateOrderStatus(req, res, next);
  clearCache('/api/orders/all');
});

export default router;