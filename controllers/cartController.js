// controllers/cartController.js - FIXED VERSION
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

// Helper to validate user
const isValidUser = (userId) => {
  return userId && userId !== "guest" && userId !== "null" && userId !== "undefined";
};

// Get user cart
export const getCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUser(userId)) {
      return res.status(401).json({ message: "Please login to view cart", requiresLogin: true });
    }

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    res.status(200).json({ cart });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch cart", error: error.message });
  }
};

// Add item to cart - ✅ COMPLETELY FIXED
export const addToCart = async (req, res) => {
  try {
    const { userId } = req.params;
    const { productId, selectedSize, selectedColor, quantity } = req.body;

    console.log("\n🟢 ========== ADD TO CART ==========");
    console.log("📦 Request Body:", req.body);
    console.log("👤 User ID:", userId);

    if (!isValidUser(userId)) {
      return res.status(401).json({ message: "Please login to add items to cart", requiresLogin: true });
    }

    if (!productId || !selectedSize || !selectedColor || !quantity) {
      return res.status(400).json({ message: "Missing required fields: productId, selectedSize, selectedColor, quantity" });
    }

    // ✅ FIX: Fetch product from database
    const product = await Product.findOne({ id: productId });
    if (!product) {
      console.error("❌ Product not found:", productId);
      return res.status(404).json({ message: "Product not found" });
    }

    console.log("✅ Product found:", product.title);

    // ✅ FIX: Use selectedSize and selectedColor from request body (NOT from undefined 'item')
    const stockData = product.stockDetails?.[selectedSize]?.[selectedColor];
    
    console.log("📊 Stock data for", selectedSize, "/", selectedColor, ":", stockData);

    if (!stockData || parseInt(stockData.quantity) < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
        availableStock: stockData ? parseInt(stockData.quantity) : 0
      });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === productId && 
              item.selectedSize === selectedSize && 
              item.selectedColor === selectedColor
    );

    const images = stockData.images || [];
    const cartItem = {
      productId,
      title: product.title,
      image: images[0] || "",
      price: product.sellingPrice || product.price,
      originalPrice: product.price,
      discount: product.discount || 0,
      selectedSize,
      selectedColor,
      quantity,
      collection: product.collection,
    };

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity > parseInt(stockData.quantity)) {
        return res.status(400).json({
          message: "Cannot add more items. Stock limit reached",
          availableStock: parseInt(stockData.quantity),
          currentCartQuantity: cart.items[existingItemIndex].quantity
        });
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      console.log("✅ Updated existing item quantity to:", newQuantity);
    } else {
      cart.items.push(cartItem);
      console.log("✅ Added new item to cart");
    }

    await cart.save();
    console.log("✅ Cart saved successfully");
    console.log("🟢 ===================================\n");

    res.status(200).json({ message: "Item added to cart successfully", cart });
  } catch (error) {
    console.error("❌ Error in addToCart:", error);
    res.status(500).json({ message: "Failed to add item to cart", error: error.message });
  }
};

// Update cart item quantity
export const updateCartItem = async (req, res) => {
  try {
    const { userId, itemIndex } = req.params;
    const { quantity } = req.body;

    console.log("\n🔄 UPDATE CART ITEM");
    console.log("userId:", userId);
    console.log("itemIndex:", itemIndex);
    console.log("quantity:", quantity);

    if (!isValidUser(userId)) {
      return res.status(401).json({ message: "Please login to update cart", requiresLogin: true });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0 || index >= cart.items.length) {
      return res.status(400).json({ message: "Invalid item index" });
    }

    const item = cart.items[index];
    const product = await Product.findOne({ id: item.productId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const stockData = product.stockDetails?.[item.selectedSize]?.[item.selectedColor];
    
    if (!stockData) {
      return res.status(400).json({ 
        message: "Stock information not found for this variant"
      });
    }

    const availableStock = parseInt(stockData.quantity);
    if (availableStock < quantity) {
      return res.status(400).json({
        message: "Insufficient stock",
        availableStock: availableStock,
        requestedQuantity: quantity
      });
    }

    cart.items[index].quantity = quantity;
    await cart.save();

    console.log("✅ Cart updated successfully\n");
    res.status(200).json({ message: "Cart item updated successfully", cart });
  } catch (error) {
    console.error("❌ Error in updateCartItem:", error);
    res.status(500).json({ message: "Failed to update cart item", error: error.message });
  }
};

// Remove item from cart
export const removeFromCart = async (req, res) => {
  try {
    const { userId, itemIndex } = req.params;

    if (!isValidUser(userId)) {
      return res.status(401).json({ message: "Please login to remove items", requiresLogin: true });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const index = parseInt(itemIndex);
    if (index < 0 || index >= cart.items.length) {
      return res.status(400).json({ message: "Invalid item index" });
    }

    cart.items.splice(index, 1);
    await cart.save();

    res.status(200).json({ message: "Item removed from cart successfully", cart });
  } catch (error) {
    res.status(500).json({ message: "Failed to remove item from cart", error: error.message });
  }
};

// Clear entire cart
export const clearCart = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUser(userId)) {
      return res.status(401).json({ message: "Please login to clear cart", requiresLogin: true });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = [];
    await cart.save();

    res.status(200).json({ message: "Cart cleared successfully", cart });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear cart", error: error.message });
  }
};

// Get cart item count
export const getCartCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!isValidUser(userId)) {
      return res.status(200).json({ count: 0 });
    }

    const cart = await Cart.findOne({ userId });
    const count = cart ? cart.totalItems : 0;

    res.status(200).json({ count });
  } catch (error) {
    res.status(500).json({ message: "Failed to get cart count", error: error.message });
  }
};