// routes/bannerRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";

const router = express.Router();

// GET all banners - Cache for 10 minutes (banners rarely change)
router.get("/", cacheMiddleware(600), getBanners);

// POST new banner - Clear cache after creating
router.post('/createBanner', async (req, res, next) => {
  await createBanner(req, res, next);
  clearCache('/api/banners'); // Clear banner cache
});

// UPDATE banner - Clear cache after updating
router.put("/:id", async (req, res, next) => {
  await updateBanner(req, res, next);
  clearCache('/api/banners');
});

// DELETE banner - Clear cache after deleting
router.delete("/:id", async (req, res, next) => {
  await deleteBanner(req, res, next);
  clearCache('/api/banners');
});

export default router;