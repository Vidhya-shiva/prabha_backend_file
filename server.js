// server.js - Updated with Courier Routes
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import connectDB from "./config/db.js";
import { validateRazorpayConfig } from "./config/razorpay.js";

// Routes
import authRoutes from "./routes/auth.js";
import adminAuthRoutes from "./routes/adminAuth.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import quoteRoutes from "./routes/quoteRoutes.js";
import navRoutes from "./routes/navRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import bestSellingRoutes from "./routes/bestSellingRoutes.js";
import instructionRoutes from "./routes/instructionRoutes.js";
import shippingInstructionRoutes from "./routes/shippingInstructionRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import timingBannerRoutes from "./routes/timingBannerRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import courierRoutes from "./routes/courierRoutes.js"; // ✅ NEW: Courier routes

dotenv.config();

const app = express();
app.use(compression());

const origins = [
  'http://localhost:5173', 
  'http://localhost:5174', 
  'http://localhost:3000', 
  'https://prabhatex.com', 
  'https://www.prabhatex.com'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origins.includes(origin) || process.env.NODE_ENV === 'development') {
      cb(null, true);
    } else {
      cb(new Error('CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-user-id']
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

let initialized = false;

const init = async () => {
  if (initialized) return;
  try {
    await connectDB();
    validateRazorpayConfig();
    initialized = true;
    console.log('✅ Services initialized');
    console.log('   ✓ Database connected');
    console.log('   ✓ Razorpay configured');
    console.log('   ✓ Ping4SMS ready (API-based, no init needed)');
    console.log('   ✓ ST Courier API ready'); // ✅ NEW
  } catch (err) {
    console.error('❌ Init failed:', err);
    throw err;
  }
};

init().catch(err => console.error('Initialization failed:', err));

// Health check routes
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Prabha Tex API', 
    timestamp: new Date().toISOString() 
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    services: { 
      database: initialized, 
      sms: 'ping4sms',
      razorpay: initialized,
      courier: 'st_courier' // ✅ NEW
    } 
  });
});

// API Routes
app.use("/auth", authRoutes);
app.use("/auth/admin", adminAuthRoutes);
app.use("/banners", bannerRoutes);
app.use("/quotes", quoteRoutes);
app.use("/navbar", navRoutes);
app.use("/collections", collectionRoutes);
app.use("/products", productRoutes);
app.use("/search", searchRoutes);
app.use("/bestselling", bestSellingRoutes);
app.use("/instructions", instructionRoutes);
app.use("/shipping-instructions", shippingInstructionRoutes);
app.use("/media", mediaRoutes);
app.use("/timing-banner", timingBannerRoutes);
app.use("/wishlist", wishlistRoutes);
app.use("/profile", profileRoutes);
app.use("/cart", cartRoutes);
app.use("/address", addressRoutes);
app.use("/orders", orderRoutes);
app.use("/api/courier", courierRoutes); // ✅ NEW: Courier routes

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal error', 
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found', 
    path: req.path 
  });
});

const PORT = process.env.PORT || 3014;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port: ${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 SMS Provider: Ping4SMS`);
  console.log(`👤 User routes: /auth/*`);
  console.log(`👨‍💼 Admin routes: /auth/admin/*`);
  console.log(`📦 Shipping instructions: /shipping-instructions/*`);
  console.log(`🚚 Courier routes: /api/courier/*`); // ✅ NEW
});

export default app;