// routes/shippingInstructionRoutes.js
import express from "express";
import * as ctrl from "../controllers/shippingInstructionController.js";

const router = express.Router();

// ✅ Get all shipping instructions (with optional isActive filter)
router.get("/", ctrl.getAllShippingInstructions);

// ✅ Get single shipping instruction by ID
router.get("/:id", ctrl.getShippingInstructionById);

// ✅ Create new shipping instruction
router.post("/", ctrl.createShippingInstruction);

// ✅ Update shipping instruction
router.put("/:id", ctrl.updateShippingInstruction);

// ✅ Soft delete (set isActive = false)
router.delete("/:id", ctrl.deleteShippingInstruction);

// ✅ Permanent delete
router.delete("/:id/permanent", ctrl.permanentlyDeleteShippingInstruction);

export default router;