// routes/instructionRoutes.js - WITH CACHE
import express from "express";
import { cacheMiddleware, clearCache } from "../middleware/cache.js";
import {
  createInstruction,
  getAllInstructions,
  getInstructionById,
  updateInstruction,
  deleteInstruction,
  permanentlyDeleteInstruction,
} from "../controllers/instructionController.js";

const router = express.Router();

// ========================================
// READ ROUTES - With Cache
// ========================================

// Get all instructions - Cache for 10 minutes
router.get("/", cacheMiddleware(600), getAllInstructions);

// Get single instruction - Cache for 10 minutes
router.get("/:id", cacheMiddleware(600), getInstructionById);

// ========================================
// WRITE ROUTES - Clear cache after modifications
// ========================================

// CREATE - Add new instruction
router.post("/", async (req, res, next) => {
  await createInstruction(req, res, next);
  clearCache('/api/instructions');
});

// UPDATE - Update instruction
router.put("/:id", async (req, res, next) => {
  await updateInstruction(req, res, next);
  clearCache('/api/instructions');
});

// DELETE - Soft delete
router.delete("/:id", async (req, res, next) => {
  await deleteInstruction(req, res, next);
  clearCache('/api/instructions');
});

// DELETE - Permanent delete
router.delete("/:id/permanent", async (req, res, next) => {
  await permanentlyDeleteInstruction(req, res, next);
  clearCache('/api/instructions');
});

export default router;