// models/Product.js - VERIFIED COMPLETE VERSION
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  collection: { type: String, required: true, index: true },
  title: { type: String, required: true, index: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  sellingPrice: { type: Number, required: true, index: true },
  discount: { type: Number, default: 0 },
  stock: { type: String, enum: ["In Stock", "Out of Stock", "Low Stock"], default: "In Stock", index: true },
  stockDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  colors: { type: String, default: "" },
  size: { type: String, default: "" },
  age: { type: String, default: "" },
  colorImages: { type: mongoose.Schema.Types.Mixed, default: {} },
  sareeType: { type: String, default: "" },
  sleeveType: { type: String, default: "" },
  
  // ✅ BOTH INSTRUCTION FIELDS MUST BE HERE
  instructionId: { type: String, default: "", index: true },
  shippingInstructionId: { type: String, default: "", index: true },
  
  isActive: { type: Boolean, default: true, index: true },
  createdBy: { type: String, default: "admin" },
}, { timestamps: true, versionKey: false });

// ✅ COMPOUND INDEXES
productSchema.index({ isActive: 1, createdAt: -1 });
productSchema.index({ isActive: 1, collection: 1 });
productSchema.index({ isActive: 1, stock: 1 });
productSchema.index({ isActive: 1, sellingPrice: 1 });

export default mongoose.model("Product", productSchema);