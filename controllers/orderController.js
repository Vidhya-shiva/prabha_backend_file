// controllers/orderController.js - WITH COURIER AUTO-BOOKING
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";
import crypto from "crypto";
import razorpayInstance from "../config/razorpay.js";
import { bookSTCourier, isSTCourierAvailable } from "../services/courierService.js"; // ✅ NEW

const generateOrderId = () => `CKT_${Date.now().toString().slice(-8)}_${Math.floor(10000 + Math.random() * 90000)}`;

// Update stock (works for both Map & Object)
const updateProductStock = async (items, isRestore = false) => {
  for (const item of items) {
    const product = await Product.findOne({ id: item.id || item.productId });
    if (!product) throw new Error(`Product not found: ${item.title}`);

    const isMap = product.stockDetails instanceof Map;
    const sizeStock = isMap ? product.stockDetails.get(item.selectedSize) : product.stockDetails?.[item.selectedSize];
    if (!sizeStock) throw new Error(`Size ${item.selectedSize} not available`);

    const colorStock = isMap ? sizeStock.get(item.selectedColor) : sizeStock[item.selectedColor];
    if (!colorStock) throw new Error(`Color ${item.selectedColor} not available`);

    const currentQty = parseInt(colorStock.quantity, 10) || 0;
    const newQty = isRestore ? currentQty + item.quantity : currentQty - item.quantity;

    if (!isRestore && newQty < 0) throw new Error(`Insufficient stock for ${product.title}`);

    colorStock.quantity = newQty;
    if (isMap) {
      sizeStock.set(item.selectedColor, colorStock);
      product.stockDetails.set(item.selectedSize, sizeStock);
    } else {
      sizeStock[item.selectedColor] = colorStock;
      product.stockDetails[item.selectedSize] = sizeStock;
      product.markModified('stockDetails');
    }

    product.stock = newQty === 0 ? "Out of Stock" : newQty < 5 ? "Low Stock" : "In Stock";
    await product.save();
  }
};

// Validate order data
const validateOrder = ({ userId, items, totalAmount, shippingAddress, customerPhone }) => {
  if (!userId) throw new Error("User ID is required");
  if (!items?.length) throw new Error("Order items are required");
  if (!totalAmount || totalAmount <= 0) throw new Error("Valid amount required");
  if (!shippingAddress) throw new Error("Shipping address required");
  if (!customerPhone) throw new Error("Customer phone number is required");

  const { street, village, district, state, pincode, country } = shippingAddress;
  const missing = [!street && 'street', !village && 'village', !district && 'district', 
    !state && 'state', !pincode && 'pincode', !country && 'country'].filter(Boolean);
  
  if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`);
};

// Normalize items to ensure both name and title exist
const normalizeOrderItems = (items) => {
  return items.map(item => ({
    id: item.id || item.productId,
    name: item.name || item.title || 'Product',
    title: item.title || item.name || 'Product',
    price: item.price,
    quantity: item.quantity,
    selectedSize: item.selectedSize,
    selectedColor: item.selectedColor,
    image: item.image,
    collection: item.collection,
    originalPrice: item.originalPrice,
    discount: item.discount,
  }));
};

// COD Order
export const placeOrder = async (req, res) => {
  try {
    const { userId, items, totalAmount, paymentMethod, shippingAddress, customerPhone, userName, userEmail } = req.body;
    
    const finalCustomerPhone = customerPhone || req.body.phone || userName;
    validateOrder({ userId, items, totalAmount, shippingAddress, customerPhone: finalCustomerPhone });
    
    const normalizedItems = normalizeOrderItems(items);
    await updateProductStock(normalizedItems);

    const orderData = {
      orderId: generateOrderId(),
      userId,
      userEmail: userEmail || "N/A",
      userName: userName || "Customer",
      customerPhone: finalCustomerPhone,
      items: normalizedItems,
      totalAmount,
      paymentMethod: paymentMethod || "cod",
      shippingAddress,
      status: "Order Placed",
      statusHistory: [{ status: "Order Placed", timestamp: new Date(), note: "Order placed" }],
    };

    const order = await new Order(orderData).save();
    await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 }).catch(() => {});
    
    res.status(201).json({ success: true, message: "Order placed", orderId: order.orderId, order });
  } catch (error) {
    console.error("❌ COD Error:", error.message);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch order", error: error.message });
  }
};

// Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "Cancelled") return res.status(400).json({ message: "Already cancelled" });
    if (["Shipped", "Delivered"].includes(order.status)) {
      return res.status(400).json({ message: "Cannot cancel shipped/delivered order" });
    }

    await updateProductStock(order.items, true);
    order.status = "Cancelled";
    order.statusHistory.push({ status: "Cancelled", timestamp: new Date(), note: "Cancelled by user" });
    await order.save();

    res.json({ success: true, message: "Order cancelled", order });
  } catch (error) {
    console.error("❌ Cancel Error:", error.message);
    res.status(500).json({ message: "Failed to cancel", error: error.message });
  }
};

// ✅ UPDATED: Update Order Status with Auto-Booking
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, note, weight } = req.body; // ✅ Accept weight for courier booking
    const validStatuses = ["Order Placed", "Processing", "Confirmed", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status", validStatuses });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ Auto-book ST Courier when status changes to "Confirmed"
    if (status === "Confirmed" && order.status !== "Confirmed") {
      const isTamilNadu = isSTCourierAvailable(order.shippingAddress);
      
      // ✅ Only auto-book if Tamil Nadu AND courier not already booked
      if (isTamilNadu && !order.courierDetails?.awbNumber) {
        console.log("📦 [Auto-Booking] Status changed to Confirmed - Attempting ST Courier booking");
        
        // ✅ Use provided weight or calculate default (0.5kg per saree)
        const orderWeight = weight || (order.items?.reduce((sum, item) => sum + item.quantity, 0) * 0.5) || 1;
        
        try {
          const bookingResult = await bookSTCourier(order, orderWeight);
          
          if (bookingResult.success) {
            console.log("✅ [Auto-Booking] ST Courier booked successfully:", bookingResult.awbNumber);
            
            // ✅ Update courier details
            order.courierDetails = {
              courierName: bookingResult.courierName,
              awbNumber: bookingResult.awbNumber,
              trackingUrl: bookingResult.trackingUrl,
              bookingStatus: "booked",
              bookingResponse: bookingResult.fullResponse,
              weight: orderWeight.toString(),
              volumetricWeight: bookingResult.fullResponse?.volweight || "",
              courierStatusHistory: [{
                status: "Booked",
                timestamp: new Date(),
                location: "PRABHA TEX - Pongalur",
                remarks: "Auto-booked on confirmation"
              }]
            };
          }
        } catch (bookingError) {
          console.error("❌ [Auto-Booking] Failed:", bookingError.message);
          // ✅ Don't fail the status update - just log the error
          order.courierDetails = {
            courierName: "ST Courier",
            awbNumber: "",
            trackingUrl: "",
            bookingStatus: "failed",
            bookingResponse: { error: bookingError.message, autoBooking: true },
            weight: orderWeight.toString(),
            volumetricWeight: "",
            courierStatusHistory: [{
              status: "Auto-Booking Failed",
              timestamp: new Date(),
              location: "System",
              remarks: `Auto-booking failed: ${bookingError.message}`
            }]
          };
        }
      }
    }

    // ✅ Update order status (existing logic)
    order.status = status;
    order.statusHistory.push({ 
      status, 
      timestamp: new Date(), 
      note: note || `Updated to ${status}` 
    });
    
    await order.save();

    res.json({ 
      success: true, 
      message: "Status updated", 
      order,
      courierBooked: order.courierDetails?.awbNumber ? true : false // ✅ Indicate if courier was booked
    });
  } catch (error) {
    console.error("❌ Update Status Error:", error.message);
    res.status(500).json({ message: "Failed to update", error: error.message });
  }
};

// Create Razorpay order
export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: "Valid amount required" });

    const order = await razorpayInstance.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({ success: true, order, key_id: process.env.RAZORPAY_KEY_ID });
  } catch (error) {
    res.status(500).json({ message: "Razorpay failed", error: error.message });
  }
};

// Verify payment
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing parameters" });
    }

    const generated = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");

    res.json(generated === razorpay_signature ? 
      { success: true, message: "Verified", paymentId: razorpay_payment_id } : 
      { success: false, message: "Verification failed" });
  } catch (error) {
    res.status(500).json({ message: "Verification failed", error: error.message });
  }
};

// Online payment order
export const placeOrderWithPayment = async (req, res) => {
  try {
    const { userId, items, totalAmount, paymentMethod, shippingAddress, paymentDetails, customerPhone, userName, userEmail } = req.body;
    
    const finalCustomerPhone = customerPhone || req.body.phone || userName;
    validateOrder({ userId, items, totalAmount, shippingAddress, customerPhone: finalCustomerPhone });

    if (paymentMethod === "online" && !paymentDetails?.razorpay_payment_id) {
      return res.status(400).json({ message: "Payment details required" });
    }

    const normalizedItems = normalizeOrderItems(items);
    await updateProductStock(normalizedItems);

    const orderData = {
      orderId: generateOrderId(),
      userId,
      userEmail: userEmail || "N/A",
      userName: userName || "Customer",
      customerPhone: finalCustomerPhone,
      items: normalizedItems,
      totalAmount,
      paymentMethod: paymentMethod || "online",
      shippingAddress,
      status: "Order Placed",
      statusHistory: [{
        status: "Order Placed",
        timestamp: new Date(),
        note: paymentMethod === "online" ? `Paid: ${paymentDetails?.razorpay_payment_id}` : "Order placed"
      }]
    };

    if (paymentMethod === "online" && paymentDetails) {
      orderData.paymentDetails = {
        razorpay_payment_id: paymentDetails.razorpay_payment_id,
        razorpay_order_id: paymentDetails.razorpay_order_id,
        payment_status: "completed",
        paid_at: new Date()
      };
    }

    const order = await new Order(orderData).save();
    await Cart.findOneAndUpdate({ userId }, { items: [], totalPrice: 0 }).catch(() => {});

    res.status(201).json({ success: true, message: "Order placed", orderId: order.orderId, order });
  } catch (error) {
    console.error("❌ Payment Order Error:", error.message);
    res.status(500).json({ message: "Failed to place order", error: error.message });
  }
};

// Get all orders (Admin)
export const getAllOrders = async (req, res) => {
  try {
    console.log("⏱️ [getAllOrders] Starting fast fetch...");
    const startTime = Date.now();

    const orders = await Order.find({})
      .select('orderId userId userName customerPhone status totalAmount createdAt shippingAddress items courierDetails') // ✅ Added courierDetails
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const duration = Date.now() - startTime;
    console.log(`✅ [getAllOrders] Fetched ${orders.length} orders in ${duration}ms`);

    res.json({ 
      success: true, 
      count: orders.length, 
      orders: orders
    });
  } catch (error) {
    console.error("❌ [getAllOrders] Error:", error.message);
    res.status(200).json({ 
      success: false,
      message: "Failed to fetch orders", 
      orders: [],
      count: 0
    });
  }
};