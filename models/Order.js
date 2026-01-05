// models/Order.js - ADD COURIER FIELDS
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    items: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        title: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        selectedSize: { type: String, required: true },
        selectedColor: { type: String, required: true },
        image: { type: String },
        collection: { type: String },
        originalPrice: { type: Number },
        discount: { type: Number },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cod"],
      default: "online",
    },
    paymentDetails: {
      razorpay_order_id: { type: String },
      razorpay_payment_id: { type: String },
      payment_status: { 
        type: String, 
        enum: ["pending", "completed", "failed"],
        default: "pending"
      },
      paid_at: { type: Date },
    },
    shippingAddress: {
      street: { type: String, required: true },
      village: { type: String, required: true },
      po: { type: String },
      taluk: { type: String },
      district: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      country: { type: String, required: true },
    },
    
    // ✅ NEW: Courier Details
    courierDetails: {
      courierName: { 
        type: String, 
        default: "" 
      },
      awbNumber: { 
        type: String, 
        default: "" 
      },
      trackingUrl: { 
        type: String, 
        default: "" 
      },
      bookingStatus: { 
        type: String, 
        enum: ["pending", "booked", "failed", "cancelled", ""],
        default: "" 
      },
      bookingResponse: { 
        type: mongoose.Schema.Types.Mixed, 
        default: {} 
      },
      courierStatusHistory: [
        {
          status: { type: String },
          timestamp: { type: Date, default: Date.now },
          location: { type: String },
          remarks: { type: String }
        }
      ],
      weight: { 
        type: String, 
        default: "" 
      },
      volumetricWeight: { 
        type: String, 
        default: "" 
      }
    },
    
    status: {
      type: String,
      enum: [
        "Order Placed", 
        "Processing", 
        "Confirmed",
        "Packed",
        "Shipped", 
        "Out for Delivery",
        "Delivered", 
        "Cancelled"
      ],
      default: "Order Placed",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// CRITICAL INDEXES FOR PERFORMANCE
orderSchema.index({ userId: 1 });
orderSchema.index({ orderId: 1 }, { unique: true });
orderSchema.index({ status: 1 });
orderSchema.index({ "paymentDetails.razorpay_payment_id": 1 });
orderSchema.index({ createdAt: -1 }, { background: true });
orderSchema.index({ 
  orderId: 'text', 
  userName: 'text', 
  userEmail: 'text',
  customerPhone: 'text'
});

// ✅ NEW: Index for courier tracking
orderSchema.index({ "courierDetails.awbNumber": 1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;