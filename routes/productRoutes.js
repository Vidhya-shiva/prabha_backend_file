// routes/productRoutes.js - SUPER SHORT VERSION
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import * as ctrl from "../controllers/productController.js";

const router = express.Router();
const cache = cacheMiddleware;

// Specific routes first
router.get("/search/query", cache(120), ctrl.searchProducts);
router.get("/newarrivals/all", cache(600), ctrl.getNewArrivals);
router.get("/price/range", cache(300), ctrl.getProductsByPriceRange);
router.get("/below499", cache(300), ctrl.getProductsBelow499);
router.get("/collection/:collection", cache(300), ctrl.getProductsByCollection);

// Batch
router.post("/batch", ctrl.getProductsByIds);

// CRUD with cache clearing
const withCacheClear = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
    clearCache();
  } catch (err) {
    console.error("Route error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

router.post("/", withCacheClear(ctrl.createProduct));
router.get("/", cache(300), ctrl.getAllProducts);
router.get("/:id", cache(120), ctrl.getProductById);
router.put("/:id", withCacheClear(ctrl.updateProduct));
router.delete("/:id", withCacheClear(ctrl.deleteProduct));
router.delete("/:id/permanent", withCacheClear(ctrl.permanentlyDeleteProduct));
router.patch("/:id/stock", withCacheClear(ctrl.updateStockQuantity));

export default router;