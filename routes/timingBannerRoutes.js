// routes/timingBannerRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  createOrUpdateTimingBanner,
  getTimingBanner,
} from "../controllers/timingBannerController.js";

const router = express.Router();

// GET - Get timing banner - Cache for 10 minutes
router.get("/", cacheMiddleware(600), getTimingBanner);

// POST - Create or update timing banner - Clear cache
router.post("/", async (req, res, next) => {
  await createOrUpdateTimingBanner(req, res, next);
  clearCache('/api/timing-banner');
});

export default router;