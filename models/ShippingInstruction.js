// models/ShippingInstruction.js
import mongoose from "mongoose";

const shippingInstructionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    heading: {
      type: String,
      required: true,
    },
    subheadings: [
      {
        subheading: { type: String, required: true },
        description: { type: String, required: true },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      default: "admin",
    },
  },
  { timestamps: true, versionKey: false }
);

// Compound indexes for better query performance
shippingInstructionSchema.index({ isActive: 1, createdAt: -1 });

export default mongoose.model("ShippingInstruction", shippingInstructionSchema);