// controllers/shippingInstructionController.js
import ShippingInstruction from "../models/ShippingInstruction.js";

const errorRes = (res, msg, err) => 
  res.status(500).json({ message: msg, error: err.message });

// ✅ Get all shipping instructions
export const getAllShippingInstructions = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};
    
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const instructions = await ShippingInstruction.find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      instructions,
      count: instructions.length
    });
  } catch (err) {
    console.error("❌ Get shipping instructions error:", err);
    errorRes(res, "Failed to fetch shipping instructions", err);
  }
};

// ✅ Get single shipping instruction by ID
export const getShippingInstructionById = async (req, res) => {
  try {
    const instruction = await ShippingInstruction.findOne({ id: req.params.id })
      .lean()
      .exec();

    if (!instruction) {
      return res.status(404).json({ 
        success: false,
        message: "Shipping instruction not found" 
      });
    }

    res.status(200).json({
      success: true,
      instruction
    });
  } catch (err) {
    console.error("❌ Get shipping instruction error:", err);
    errorRes(res, "Failed to fetch shipping instruction", err);
  }
};

// ✅ Create new shipping instruction
export const createShippingInstruction = async (req, res) => {
  try {
    const data = req.body;

    // Check if ID already exists
    const exists = await ShippingInstruction.findOne({ id: data.id })
      .select('id')
      .lean()
      .exec();

    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Shipping Instruction ID ${data.id} already exists`
      });
    }

    const instruction = await new ShippingInstruction(data).save();

    res.status(201).json({
      success: true,
      message: "Shipping instruction created successfully",
      instruction: instruction.toObject()
    });
  } catch (err) {
    console.error("❌ Create shipping instruction error:", err);
    errorRes(res, "Failed to create shipping instruction", err);
  }
};

// ✅ Update shipping instruction
export const updateShippingInstruction = async (req, res) => {
  try {
    const data = req.body;
    delete data._id;
    delete data.id; // Don't allow ID changes

    const instruction = await ShippingInstruction.findOneAndUpdate(
      { id: req.params.id },
      { $set: data },
      { new: true, runValidators: true, lean: true }
    ).exec();

    if (!instruction) {
      return res.status(404).json({ 
        success: false,
        message: "Shipping instruction not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipping instruction updated successfully",
      instruction
    });
  } catch (err) {
    console.error("❌ Update shipping instruction error:", err);
    errorRes(res, "Failed to update shipping instruction", err);
  }
};

// ✅ Soft delete (set isActive = false)
export const deleteShippingInstruction = async (req, res) => {
  try {
    const instruction = await ShippingInstruction.findOneAndUpdate(
      { id: req.params.id },
      { $set: { isActive: false } },
      { new: true, lean: true }
    ).exec();

    if (!instruction) {
      return res.status(404).json({ 
        success: false,
        message: "Shipping instruction not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipping instruction deleted successfully",
      instruction
    });
  } catch (err) {
    console.error("❌ Delete shipping instruction error:", err);
    errorRes(res, "Failed to delete shipping instruction", err);
  }
};

// ✅ Permanent delete
export const permanentlyDeleteShippingInstruction = async (req, res) => {
  try {
    const instruction = await ShippingInstruction.findOneAndDelete({ id: req.params.id })
      .lean()
      .exec();

    if (!instruction) {
      return res.status(404).json({ 
        success: false,
        message: "Shipping instruction not found" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Shipping instruction permanently deleted",
      instruction
    });
  } catch (err) {
    console.error("❌ Permanent delete error:", err);
    errorRes(res, "Failed to permanently delete shipping instruction", err);
  }
};