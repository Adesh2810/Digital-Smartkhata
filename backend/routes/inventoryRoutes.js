import express from "express";

import {
  addProduct,
  deleteProduct,
  getInventorySummary,
  getProducts,
  getStockHistory,
  updateProduct,
  updateStock,
} from "../controllers/inventoryController.js";

const router = express.Router();

router.get("/summary", getInventorySummary);
router.get("/products", getProducts);
router.post("/products", addProduct);
router.put("/products/:id", updateProduct);
router.patch("/products/:id/stock", updateStock);
router.delete("/products/:id", deleteProduct);
router.get("/history", getStockHistory);

export default router;
