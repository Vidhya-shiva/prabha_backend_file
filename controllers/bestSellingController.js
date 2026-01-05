// controllers/bestSellingController.js - SHORT VERSION
import BestSelling from "../models/BestSelling.js";
import Product from "../models/Product.js";

// Helper to convert Maps to Objects
const convertMapsToObjects = (product) => {
  const productObj = product.toObject ? product.toObject() : product;
  return {
    ...productObj,
    stockDetails: productObj.stockDetails
      ? Object.fromEntries(
          Object.entries(productObj.stockDetails).map(([key, value]) => [
            key,
            value instanceof Map ? Object.fromEntries(value) : value,
          ])
        )
      : {},
    colorImages: productObj.colorImages
      ? productObj.colorImages instanceof Map
        ? Object.fromEntries(productObj.colorImages)
        : productObj.colorImages
      : {},
  };
};

// Get all best selling products
export const getAllBestSelling = async (req, res) => {
  try {
    const bestSellingProducts = await BestSelling.getBestSellingWithProducts();
    res.status(200).json({ success: true, products: bestSellingProducts, count: bestSellingProducts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch best selling products", error: error.message });
  }
};

// Add product to best selling
export const addToBestSelling = async (req, res) => {
  try {
    const { productId } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: "Product ID is required" });

    const product = await Product.findOne({ id: productId, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: "Product not found or inactive" });

    const existing = await BestSelling.findOne({ productId });
    if (existing) return res.status(400).json({ success: false, message: "Product is already in best selling list" });

    const lastItem = await BestSelling.findOne().sort({ order: -1 });
    const newOrder = lastItem ? lastItem.order + 1 : 0;

    const bestSellingItem = await BestSelling.create({ productId, order: newOrder, isActive: true });

    const productWithDetails = {
      ...convertMapsToObjects(product),
      bestSellingOrder: bestSellingItem.order,
      bestSellingId: bestSellingItem._id,
    };

    res.status(201).json({ success: true, message: "Product added to best selling", product: productWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to add product to best selling", error: error.message });
  }
};

// Remove product from best selling
export const removeFromBestSelling = async (req, res) => {
  try {
    const deleted = await BestSelling.findOneAndDelete({ productId: req.params.productId });
    if (!deleted) return res.status(404).json({ success: false, message: "Product not found in best selling list" });

    res.status(200).json({ success: true, message: "Product removed from best selling", productId: req.params.productId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to remove product from best selling", error: error.message });
  }
};

// Toggle best selling status
export const toggleBestSellingStatus = async (req, res) => {
  try {
    const item = await BestSelling.findOne({ productId: req.params.productId });
    if (!item) return res.status(404).json({ success: false, message: "Product not found in best selling list" });

    item.isActive = !item.isActive;
    await item.save();

    res.status(200).json({
      success: true,
      message: `Best selling ${item.isActive ? "activated" : "deactivated"}`,
      isActive: item.isActive,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle best selling status", error: error.message });
  }
};

// Update best selling order
export const updateBestSellingOrder = async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: "Items array is required" });
    }

    const updatePromises = items.map(({ productId, order }) =>
      BestSelling.findOneAndUpdate({ productId }, { $set: { order } }, { new: true })
    );

    await Promise.all(updatePromises);
    res.status(200).json({ success: true, message: "Best selling order updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update best selling order", error: error.message });
  }
};

// Clear all best selling
export const clearAllBestSelling = async (req, res) => {
  try {
    const result = await BestSelling.deleteMany({});
    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} best selling items`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to clear best selling", error: error.message });
  }
};

// Sync best selling with products
export const syncBestSelling = async (req, res) => {
  try {
    const bestSellingItems = await BestSelling.find();
    const productIds = bestSellingItems.map((item) => item.productId);

    const activeProducts = await Product.find({ id: { $in: productIds }, isActive: true });
    const activeProductIds = new Set(activeProducts.map((p) => p.id));

    const itemsToRemove = bestSellingItems.filter((item) => !activeProductIds.has(item.productId));

    if (itemsToRemove.length > 0) {
      await BestSelling.deleteMany({ productId: { $in: itemsToRemove.map((item) => item.productId) } });
    }

    res.status(200).json({
      success: true,
      message: "Best selling synced successfully",
      removedCount: itemsToRemove.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to sync best selling", error: error.message });
  }
};