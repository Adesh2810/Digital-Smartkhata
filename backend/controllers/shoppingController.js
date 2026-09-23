import db from "../config/db.js";
import { ensureInventorySchema, getProducts } from "./inventoryController.js";

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const beginTransaction = () =>
  new Promise((resolve, reject) => {
    db.beginTransaction((err) => (err ? reject(err) : resolve()));
  });

const commit = () =>
  new Promise((resolve, reject) => {
    db.commit((err) => (err ? reject(err) : resolve()));
  });

const rollback = () =>
  new Promise((resolve) => {
    db.rollback(() => resolve());
  });

const sendError = (res, message, err, status = 500) => {
  if (err) console.log(message, err);
  res.status(status).json({ success: false, message });
};

const toAmount = (value) => Number(value || 0);
const toNumber = (value) => Number(value || 0);
const normalizeDateTime = (value) => String(value || "").replace("T", " ").slice(0, 19);

const schemaReady = (async () => {
  await ensureInventorySchema;

  await query(`
    CREATE TABLE IF NOT EXISTS shopping_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(160) NOT NULL,
      mobile VARCHAR(30),
      pickup_time DATETIME NOT NULL,
      total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
      status ENUM('Placed', 'Packing', 'Ready', 'Collected', 'Cancelled') NOT NULL DEFAULT 'Placed',
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS shopping_order_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(160) NOT NULL,
      quantity INT NOT NULL,
      price DECIMAL(12, 2) NOT NULL,
      line_total DECIMAL(12, 2) NOT NULL
    )
  `);
})();

export const getShoppingProducts = getProducts;

export const getOrders = async (req, res) => {
  try {
    await schemaReady;
    const orders = await query("SELECT * FROM shopping_orders ORDER BY id DESC LIMIT 80");
    const items = await query("SELECT * FROM shopping_order_items ORDER BY id DESC");
    const grouped = orders.map((order) => ({
      ...order,
      items: items.filter((item) => Number(item.order_id) === Number(order.id)),
    }));

    res.status(200).json(grouped);
  } catch (err) {
    sendError(res, "Orders Fetch Failed", err);
  }
};

export const createOrder = async (req, res) => {
  const { customer_name, mobile, pickup_time, note, items } = req.body;

  if (!customer_name || !pickup_time || !Array.isArray(items) || items.length === 0) {
    return sendError(res, "Customer, pickup time and products are required", null, 400);
  }

  try {
    await schemaReady;
    await beginTransaction();

    let totalAmount = 0;
    const preparedItems = [];
    const requestedItems = new Map();

    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = toNumber(item.quantity);

      if (!productId || quantity <= 0) {
        await rollback();
        return sendError(res, "Selected products and quantities are required", null, 400);
      }

      requestedItems.set(productId, (requestedItems.get(productId) || 0) + quantity);
    }

    for (const [productId, quantity] of requestedItems.entries()) {
      const rows = await query("SELECT * FROM products WHERE id = ? FOR UPDATE", [productId]);
      const product = rows[0];

      if (!product) {
        await rollback();
        return sendError(res, "Selected product not found", null, 404);
      }

      if (quantity <= 0 || quantity > toNumber(product.stock_qty)) {
        await rollback();
        return sendError(res, `${product.product_name} stock is not enough`, null, 400);
      }

      const price = toAmount(product.price);
      const lineTotal = price * quantity;
      totalAmount += lineTotal;
      preparedItems.push({ product, quantity, price, lineTotal });
    }

    const orderResult = await query(
      `
        INSERT INTO shopping_orders
        (customer_name, mobile, pickup_time, total_amount, note)
        VALUES (?, ?, ?, ?, ?)
      `,
      [customer_name.trim(), mobile || "", normalizeDateTime(pickup_time), totalAmount, note || ""]
    );

    for (const item of preparedItems) {
      await query(
        `
          INSERT INTO shopping_order_items
          (order_id, product_id, product_name, quantity, price, line_total)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [orderResult.insertId, item.product.id, item.product.product_name, item.quantity, item.price, item.lineTotal]
      );

      await query("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?", [item.quantity, item.product.id]);
      await query(
        "INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, note) VALUES (?, ?, 'ORDER', ?, ?)",
        [item.product.id, item.product.product_name, item.quantity, `Order #${orderResult.insertId}`]
      );
    }

    await commit();
    res.status(201).json({
      success: true,
      message: "Order placed. Pack products before selected pickup time.",
      id: orderResult.insertId,
      total_amount: totalAmount,
    });
  } catch (err) {
    await rollback();
    sendError(res, "Order Save Failed", err);
  }
};

export const updateOrderStatus = async (req, res) => {
  const allowed = ["Placed", "Packing", "Ready", "Collected", "Cancelled"];
  const status = req.body.status;

  if (!allowed.includes(status)) {
    return sendError(res, "Invalid order status", null, 400);
  }

  try {
    await schemaReady;
    await beginTransaction();

    const orderRows = await query("SELECT * FROM shopping_orders WHERE id = ? FOR UPDATE", [req.params.id]);
    const order = orderRows[0];

    if (!order) {
      await rollback();
      return sendError(res, "Order not found", null, 404);
    }

    const items = await query("SELECT * FROM shopping_order_items WHERE order_id = ?", [req.params.id]);

    if (status === "Cancelled" && order.status !== "Cancelled") {
      for (const item of items) {
        await query("UPDATE products SET stock_qty = stock_qty + ? WHERE id = ?", [item.quantity, item.product_id]);
        await query(
          "INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, note) VALUES (?, ?, 'ADD', ?, ?)",
          [item.product_id, item.product_name, item.quantity, `Cancelled order #${req.params.id}`]
        );
      }
    }

    if (order.status === "Cancelled" && status !== "Cancelled") {
      for (const item of items) {
        const productRows = await query("SELECT * FROM products WHERE id = ? FOR UPDATE", [item.product_id]);
        const product = productRows[0];

        if (!product || toNumber(product.stock_qty) < toNumber(item.quantity)) {
          await rollback();
          return sendError(res, `${item.product_name} stock is not enough`, null, 400);
        }

        await query("UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?", [item.quantity, item.product_id]);
        await query(
          "INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, note) VALUES (?, ?, 'ORDER', ?, ?)",
          [item.product_id, item.product_name, item.quantity, `Reopened order #${req.params.id}`]
        );
      }
    }

    await query("UPDATE shopping_orders SET status = ? WHERE id = ?", [status, req.params.id]);
    await commit();

    res.status(200).json({ success: true, message: "Order Status Updated" });
  } catch (err) {
    await rollback();
    sendError(res, "Order Status Update Failed", err);
  }
};

// ADD NEW PRODUCT
export const addProduct = async (req, res) => {
  const {
    product_name,
    category,
    price,
    stock_qty,
    image_url,
    description,
  } = req.body;

  if (!product_name || !category || !price) {
    return res.status(400).json({
      success: false,
      message: "Product Name, Category and Price are required",
    });
  }

  try {
    await schemaReady;

    const result = await query(
      `
      INSERT INTO products
      (
        product_name,
        category,
        price,
        stock_qty,
        image_url,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        product_name,
        category,
        price,
        stock_qty || 0,
        image_url || "",
        description || "",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Product Added Successfully",
      id: result.insertId,
    });
  } catch (err) {
    sendError(res, "Product Add Failed", err);
  }
};


// UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  const { id } = req.params;

  const {
    product_name,
    category,
    price,
    stock_qty,
    image_url,
    description,
  } = req.body;

  try {
    await schemaReady;

    const result = await query(
      `
      UPDATE products
      SET
        product_name = ?,
        category = ?,
        price = ?,
        stock_qty = ?,
        image_url = ?,
        description = ?
      WHERE id = ?
      `,
      [
        product_name,
        category,
        price,
        stock_qty,
        image_url,
        description,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product Updated Successfully",
    });
  } catch (err) {
    sendError(res, "Product Update Failed", err);
  }
};


// DELETE PRODUCT
export const deleteProduct = async (req, res) => {
  try {
    await schemaReady;

    const result = await query(
      "DELETE FROM products WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Product Not Found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product Deleted Successfully",
    });
  } catch (err) {
    sendError(res, "Product Delete Failed", err);
  }
};
