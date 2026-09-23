import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import customerCreditRoutes from "./routes/customerCreditRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import supplierPurchaseRoutes from "./routes/supplierPurchaseRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import shoppingRoutes from "./routes/shoppingRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/customer-credits", customerCreditRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/supplier-purchases", supplierPurchaseRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/inventory", inventoryRoutes);

// Test Route
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Smart Khata API Running Successfully 🚀",
  });
});

// 404 Route
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server Running On Port ${PORT}`);
});
