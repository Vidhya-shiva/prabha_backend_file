// controllers/productController.js - PERFORMANCE OPTIMIZED
import Product from "../models/Product.js";

const errorRes = (res, msg, err) => res.status(500).json({ message: msg, error: err.message });

// ✅ LIGHTWEIGHT projection for list views
const listProjection = {
  id: 1,
  collection: 1,
  title: 1,
  price: 1,
  sellingPrice: 1,
  discount: 1,
  stock: 1,
  stockDetails: 1,
  instructionId: 1,
  createdAt: 1
};

// ✅ OPTIMIZED: Server-side pagination + filtering (UNCOMMENTED AND FIXED)
export const getAllProducts = async (req, res) => {
  const startTime = Date.now(); // ⏱️ Start timer
  
  try {
    const {
      collection,
      stock,
      isActive = 'true',
      page = 1,
      limit = 10,
      productId,
      instructionId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    console.log('🔍 Query params:', { collection, stock, page, limit, productId, instructionId });

    const filter = { isActive: isActive === 'true' };

    if (collection && collection !== '') {
      filter.collection = { $regex: new RegExp(`^${collection}$`, 'i') };
    }
    if (stock && stock !== '') {
      filter.stock = stock;
    }
    if (productId && productId !== '') {
      filter.id = { $regex: new RegExp(productId, 'i') };
    }
    if (instructionId && instructionId !== '') {
      filter.instructionId = { $regex: new RegExp(instructionId, 'i') };
    }

    console.log('📊 Filter:', filter);

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [products, totalCount] = await Promise.all([
      Product.find(filter)
        .select(listProjection)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
      Product.countDocuments(filter).exec()
    ]);

    const timeTaken = Date.now() - startTime; // ⏱️ Calculate time
    console.log(`✅ Query completed in ${timeTaken}ms`); // Show time

    res.status(200).json({
      products,
      totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      hasMore: skip + products.length < totalCount
    });
  } catch (err) {
    console.error("❌ Get products error:", err);
    errorRes(res, "Failed to fetch products", err);
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!data.collection) {
      return res.status(400).json({
        message: "Collection name is required to generate Product ID"
      });
    }

    const generatedId = await generateProductId(data.collection);

    const exists = await Product.findOne({ id: generatedId })
      .select('id')
      .lean()
      .exec();

    if (exists) {
      return res.status(400).json({
        message: `Product ID ${generatedId} already exists. Please try again.`
      });
    }

    data.id = generatedId;
    if (data.isActive === undefined) data.isActive = true;

    const product = await new Product(data).save();

    res.status(201).json({
      message: "Product created successfully",
      product: product.toObject(),
      generatedId: generatedId
    });

  } catch (err) {
    console.error("Create product error:", err);
    errorRes(res, "Failed to create product", err);
  }
};

// Get single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id })
      .lean()
      .exec();

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ product });
  } catch (err) {
    errorRes(res, "Failed to fetch product", err);
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const data = req.body;
    delete data._id;
    delete data.id;

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: data },
      { new: true, runValidators: true, lean: true }
    ).exec();

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product updated", product });
  } catch (err) {
    errorRes(res, "Failed to update product", err);
  }
};

// Soft delete
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      { $set: { isActive: false } },
      { new: true, lean: true }
    ).exec();

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product deleted", product });
  } catch (err) {
    errorRes(res, "Failed to delete product", err);
  }
};

// Permanent delete
export const permanentlyDeleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id })
      .lean()
      .exec();

    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json({ message: "Product permanently deleted", product });
  } catch (err) {
    errorRes(res, "Failed to permanently delete", err);
  }
};

// Get by collection
export const getProductsByCollection = async (req, res) => {
  try {
    const col = decodeURIComponent(req.params.collection)
      .trim()
      .replace(/-/g, ' ')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const products = await Product.find({
      collection: { $regex: new RegExp(`^${col}$`, 'i') },
      isActive: true
    })
      .select(listProjection)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    res.status(200).json({
      success: true,
      products,
      count: products.length,
      collection: col
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: err.message
    });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Search query required" });

    const regex = new RegExp(query, 'i');
    const products = await Product.find({
      isActive: true,
      $or: [
        { title: regex },
        { description: regex },
        { collection: regex },
        { colors: regex }
      ]
    })
      .select(listProjection)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec();

    res.status(200).json({ products, count: products.length });
  } catch (err) {
    errorRes(res, "Failed to search", err);
  }
};

// Get new arrivals
export const getNewArrivals = async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const products = await Product.find({ isActive: true })
      .select(listProjection)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean()
      .exec();

    res.status(200).json({ products, count: products.length });
  } catch (err) {
    errorRes(res, "Failed to fetch new arrivals", err);
  }
};

// Get by price range
export const getProductsByPriceRange = async (req, res) => {
  try {
    const { min, max } = req.query;
    const filter = { isActive: true };

    if (min) filter.sellingPrice = { $gte: parseFloat(min) };
    if (max) filter.sellingPrice = { ...filter.sellingPrice, $lte: parseFloat(max) };

    const products = await Product.find(filter)
      .select(listProjection)
      .sort({ sellingPrice: 1 })
      .lean()
      .exec();

    res.status(200).json({ products, count: products.length });
  } catch (err) {
    errorRes(res, "Failed to fetch", err);
  }
};

// Update stock
export const updateStockQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { size, color, quantity } = req.body;

    const product = await Product.findOne({ id }).exec();
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (!product.stockDetails) product.stockDetails = {};
    if (!product.stockDetails[size]) product.stockDetails[size] = {};
    product.stockDetails[size][color] = { quantity };
    product.markModified('stockDetails');

    const saved = await product.save();
    res.status(200).json({ message: "Stock updated", product: saved.toObject() });
  } catch (err) {
    errorRes(res, "Failed to update stock", err);
  }
};

// Products below 499
export const getProductsBelow499 = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const products = await Product.find({
      isActive: true,
      sellingPrice: { $lte: 499 }
    })
      .select(listProjection)
      .sort({ sellingPrice: 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean()
      .exec();

    const totalCount = skip > 0 || limit < 50
      ? await Product.countDocuments({
        isActive: true,
        sellingPrice: { $lte: 499 }
      }).exec()
      : products.length;

    res.status(200).json({
      success: true,
      products,
      count: products.length,
      totalCount
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: err.message
    });
  }
};

// Get products by IDs
export const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "IDs array required"
      });
    }

    const products = await Product.find({
      id: { $in: ids },
      isActive: true
    })
      .select(listProjection)
      .lean()
      .exec();

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found",
        requestedIds: ids
      });
    }

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch",
      error: err.message
    });
  }
};

const getCollectionCode = (collectionName) => {
  if (!collectionName) return "PROD";

  const words = collectionName
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(/\s+/);

  let code = '';

  if (words.length === 1) {
    code = words[0].substring(0, 4).toUpperCase();
  } else {
    code = (words[0].substring(0, 2) + words[1].substring(0, 2)).toUpperCase();
  }

  return code.padEnd(4, 'X');
};

const getNextSerialNumber = async (collectionCode, year, month) => {
  try {
    const prefix = `${collectionCode}-${year}${month}`;
    const regex = new RegExp(`^${prefix}\\d{1,5}$`);

    const products = await Product.find({
      id: { $regex: regex }
    })
      .select('id')
      .lean()
      .exec();

    if (products.length === 0) {
      return '01';
    }

    const serialNumbers = products.map(p => {
      const match = p.id.match(new RegExp(`${prefix}(\\d{1,5})$`));
      return match ? parseInt(match[1]) : 0;
    });

    const maxSerial = Math.max(...serialNumbers);
    const nextSerial = maxSerial + 1;

    return nextSerial.toString().padStart(2, '0');
  } catch (error) {
    console.error("Error getting serial number:", error);
    return '01';
  }
};

export const generateProductId = async (collectionName) => {
  try {
    const collectionCode = getCollectionCode(collectionName);
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const serialNumber = await getNextSerialNumber(collectionCode, year, month);
    const productId = `${collectionCode}-${year}${month}${serialNumber}`;

    console.log(`✅ Generated Product ID: ${productId} for collection: ${collectionName}`);
    return productId;

  } catch (error) {
    console.error("Error generating product ID:", error);
    throw new Error("Failed to generate product ID");
  }
};