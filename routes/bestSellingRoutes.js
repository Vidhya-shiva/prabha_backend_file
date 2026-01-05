// routes/bestSellingRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  getAllBestSelling,
  addToBestSelling,
  removeFromBestSelling,
  toggleBestSellingStatus,
  updateBestSellingOrder,
  clearAllBestSelling,
  syncBestSelling,
} from "../controllers/bestSellingController.js";

const router = express.Router();

// ========================================
// PUBLIC ROUTES - Cache for 5 minutes
// ========================================
router.get("/", cacheMiddleware(300), getAllBestSelling);

// ========================================
// ADMIN ROUTES - Clear cache after modifications
// ========================================

// POST - Add product to best selling
router.post("/", async (req, res, next) => {
  await addToBestSelling(req, res, next);
  clearCache('/api/bestselling');
});

// DELETE - Remove product
router.delete("/:productId", async (req, res, next) => {
  await removeFromBestSelling(req, res, next);
  clearCache('/api/bestselling');
});

// PATCH - Toggle status
router.patch("/:productId/toggle", async (req, res, next) => {
  await toggleBestSellingStatus(req, res, next);
  clearCache('/api/bestselling');
});

// PUT - Update order
router.put("/reorder", async (req, res, next) => {
  await updateBestSellingOrder(req, res, next);
  clearCache('/api/bestselling');
});

// DELETE - Clear all
router.delete("/clear/all", async (req, res, next) => {
  await clearAllBestSelling(req, res, next);
  clearCache('/api/bestselling');
});

// POST - Sync with products
router.post("/sync", async (req, res, next) => {
  await syncBestSelling(req, res, next);
  clearCache('/api/bestselling');
});

export default router;