// routes/quoteRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  createQuote,
  getAllQuote,
  updateQuote,
  deleteQuote,
  clearAllQuotes,
} from "../controllers/quoteController.js";

const router = express.Router();

// GET - Get all quotes - Cache for 10 minutes
router.get("/", cacheMiddleware(600), getAllQuote);

// POST - Create quote - Clear cache
router.post("/", async (req, res, next) => {
  await createQuote(req, res, next);
  clearCache('/api/quotes');
});

// PUT - Update quote - Clear cache
router.put("/:id", async (req, res, next) => {
  await updateQuote(req, res, next);
  clearCache('/api/quotes');
});

// DELETE - Delete specific quote - Clear cache
router.delete("/:id", async (req, res, next) => {
  await deleteQuote(req, res, next);
  clearCache('/api/quotes');
});

// DELETE - Clear all quotes - Clear cache
router.delete("/", async (req, res, next) => {
  await clearAllQuotes(req, res, next);
  clearCache('/api/quotes');
});

export default router;