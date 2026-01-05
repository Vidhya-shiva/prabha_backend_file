// updateProducts.js - Run this ONCE to add shippingInstructionId to all products
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const updateProducts = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Update all products to have shippingInstructionId field
    const result = await mongoose.connection.db.collection("products").updateMany(
      { shippingInstructionId: { $exists: false } }, // Find products without this field
      { $set: { shippingInstructionId: "" } } // Add empty string as default
    );

    console.log("✅ Update Complete!");
    console.log(`📊 Modified ${result.modifiedCount} products`);
    console.log(`📊 Matched ${result.matchedCount} products`);

    // Verify by checking a few products
    const sampleProducts = await mongoose.connection.db
      .collection("products")
      .find({})
      .limit(5)
      .toArray();

    console.log("\n📋 Sample Products (first 5):");
    sampleProducts.forEach((p) => {
      console.log(`  - ${p.id}: instructionId="${p.instructionId}", shippingInstructionId="${p.shippingInstructionId}"`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

updateProducts();