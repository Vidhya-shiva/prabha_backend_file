// routes/mediaRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  createMedia,
  getMedia,
  updateMedia,
  deleteMedia,
} from "../controllers/mediaController.js";

const router = express.Router();

// GET ALL - Cache for 10 minutes (media rarely changes)
router.get("/", cacheMiddleware(600), getMedia);

// CREATE - Clear cache after creating
router.post("/", async (req, res, next) => {
  await createMedia(req, res, next);
  clearCache('/api/media');
});

// UPDATE - Clear cache after updating
router.put("/:id", async (req, res, next) => {
  await updateMedia(req, res, next);
  clearCache('/api/media');
});

// DELETE - Clear cache after deleting
router.delete("/:id", async (req, res, next) => {
  await deleteMedia(req, res, next);
  clearCache('/api/media');
});

export default router;