// routes/cartRoutes.js - FIXED ROUTE ORDER
import express from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
} from "../controllers/cartController.js";

const router = express.Router();

// ========================================
// 🛒 CART ROUTES
// ⚠️ IMPORTANT: More specific routes MUST come BEFORE generic /:userId routes
// ========================================

// GET - Get cart item count (BEFORE /:userId)
// GET /api/cart/:userId/count
router.get("/:userId/count", getCartCount);

// POST - Add item to cart (BEFORE /:userId)
// POST /api/cart/:userId/add
router.post("/:userId/add", addToCart);

// PUT - Update cart item quantity (BEFORE /:userId)
// PUT /api/cart/:userId/update/:itemIndex
router.put("/:userId/update/:itemIndex", updateCartItem);

// DELETE - Remove item from cart (BEFORE /:userId)
// DELETE /api/cart/:userId/remove/:itemIndex
router.delete("/:userId/remove/:itemIndex", removeFromCart);

// DELETE - Clear entire cart (BEFORE /:userId)
// DELETE /api/cart/:userId/clear
router.delete("/:userId/clear", clearCart);

// GET - Get user's cart (This should be LAST among /:userId routes)
// GET /api/cart/:userId
router.get("/:userId", getCart);

export default router;