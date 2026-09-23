import db from "../config/db.js";

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const sendError = (res, message, err, status = 500) => {
  if (err) console.log(message, err);
  res.status(status).json({ success: false, message });
};

const toAmount = (value) => Number(value || 0);
const toNumber = (value) => Number(value || 0);

const columnExists = async (table, column) => {
  const rows = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
};

const tableExists = async (table) => {
  const rows = await query("SHOW TABLES LIKE ?", [table]);
  return rows.length > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
  if (!(await columnExists(table, column))) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
};

const schemaReady = (async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(160) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'General',
      price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
      stock_qty INT NOT NULL DEFAULT 0,
      min_stock INT NOT NULL DEFAULT 5,
      image_url TEXT,
      description TEXT,
      stock_entry_date DATE,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("products", "category", "category VARCHAR(100) NOT NULL DEFAULT 'General'");
  await addColumnIfMissing("products", "price", "price DECIMAL(12, 2) NOT NULL DEFAULT 0");
  await addColumnIfMissing("products", "cost_price", "cost_price DECIMAL(12, 2) NOT NULL DEFAULT 0");
  await addColumnIfMissing("products", "stock_qty", "stock_qty INT NOT NULL DEFAULT 0");
  await addColumnIfMissing("products", "min_stock", "min_stock INT NOT NULL DEFAULT 5");
  await addColumnIfMissing("products", "image_url", "image_url TEXT");
  await addColumnIfMissing("products", "description", "description TEXT");
  await addColumnIfMissing("products", "stock_entry_date", "stock_entry_date DATE");
  await addColumnIfMissing(
    "products",
    "last_updated",
    "last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );
  await addColumnIfMissing("products", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      product_name VARCHAR(160) NOT NULL,
      movement_type ENUM('ADD', 'REDUCE', 'ORDER') NOT NULL,
      quantity INT NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("stock_movements", "note", "note TEXT");
  await addColumnIfMissing("stock_movements", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

  await query(`
    DELETE p1 FROM products p1
    JOIN products p2
      ON LOWER(TRIM(p1.product_name)) = LOWER(TRIM(p2.product_name))
     AND p1.id > p2.id
  `);

  const sampleProducts = [
    ["Aashirvaad Atta 5kg", "Flour", 280, 245, 25, 8, "https://placehold.co/500x360/fef3c7/92400e?text=Aashirvaad+Atta", "Premium wheat flour pack for daily household use."],
    ["Fortune Sunflower Oil 1L", "Oil", 165, 142, 12, 6, "https://placehold.co/500x360/fff7ed/c2410c?text=Sunflower+Oil", "Refined sunflower oil suitable for cooking."],
    ["Tata Salt 1kg", "Groceries", 28, 22, 8, 10, "https://placehold.co/500x360/e0f2fe/0369a1?text=Tata+Salt", "Iodized salt pack for everyday kitchen needs."],
    ["Parle-G Biscuit 200g", "Snacks", 10, 8, 30, 12, "https://placehold.co/500x360/fef9c3/854d0e?text=Parle-G", "Classic glucose biscuit pack."],
    ["Maggi Noodles", "Snacks", 15, 12, 5, 10, "https://placehold.co/500x360/fef08a/a16207?text=Maggi", "Instant noodles pack."],
    ["Amul Milk 500ml", "Dairy", 32, 28, 15, 10, "https://placehold.co/500x360/ecfeff/0e7490?text=Amul+Milk", "Fresh milk pouch."],
  ];

  for (const product of sampleProducts) {
    await query(
      `
        INSERT INTO products
        (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, CURDATE()
        WHERE NOT EXISTS (
          SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = LOWER(TRIM(?))
        )
      `,
      [...product, product[0]]
    );
  }
})();

export const ensureInventorySchema = schemaReady;

const productStatusSql = `
  CASE
    WHEN stock_qty <= 0 THEN 'Out of Stock'
    WHEN stock_qty <= min_stock THEN 'Low Stock'
    ELSE 'Normal'
  END
`;

export const getProducts = async (req, res) => {
  try {
    await schemaReady;
    const rows = await query(`
      SELECT *, ${productStatusSql} AS stock_status
      FROM products
      ORDER BY product_name ASC
    `);
    res.status(200).json(rows);
  } catch (err) {
    sendError(res, "Products Fetch Failed", err);
  }
};

export const getInventorySummary = async (req, res) => {
  try {
    await schemaReady;
    const rows = await query(`
      SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(stock_qty), 0) AS total_stock,
        COALESCE(SUM(stock_qty * cost_price), 0) AS inventory_value,
        SUM(CASE WHEN stock_qty <= min_stock THEN 1 ELSE 0 END) AS low_stock_items,
        SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) AS out_stock_items
      FROM products
    `);

    const summary = rows[0] || {};
    res.status(200).json({
      total_products: Number(summary.total_products || 0),
      total_stock: Number(summary.total_stock || 0),
      inventory_value: toAmount(summary.inventory_value),
      low_stock_items: Number(summary.low_stock_items || 0),
      out_stock_items: Number(summary.out_stock_items || 0),
    });
  } catch (err) {
    sendError(res, "Inventory Summary Failed", err);
  }
};

export const addProduct = async (req, res) => {
  const {
    product_name,
    category,
    price,
    cost_price,
    stock_qty,
    min_stock,
    image_url,
    description,
    stock_entry_date,
  } = req.body;

  if (!product_name || !price || toAmount(price) <= 0) {
    return sendError(res, "Product name and price are required", null, 400);
  }

  if (toNumber(stock_qty) < 0 || toNumber(min_stock) < 0) {
    return sendError(res, "Stock values cannot be negative", null, 400);
  }

  try {
    await schemaReady;
    const result = await query(
      `
        INSERT INTO products
        (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        product_name,
        category || "General",
        toAmount(price),
        toAmount(cost_price || price),
        toNumber(stock_qty),
        toNumber(min_stock || 5),
        image_url || "https://placehold.co/500x360/e5e7eb/334155?text=Product",
        description || "",
        stock_entry_date || new Date().toISOString().slice(0, 10),
      ]
    );

    res.status(201).json({ success: true, message: "Product Added", id: result.insertId });
  } catch (err) {
    sendError(res, "Product Save Failed", err);
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    product_name,
    category,
    price,
    cost_price,
    stock_qty,
    min_stock,
    image_url,
    description,
    stock_entry_date,
  } = req.body;

  if (!product_name || !price || toAmount(price) <= 0) {
    return sendError(res, "Product name and price are required", null, 400);
  }

  if (toNumber(stock_qty) < 0 || toNumber(min_stock) < 0) {
    return sendError(res, "Stock values cannot be negative", null, 400);
  }

  try {
    await schemaReady;
    const productRows = await query("SELECT * FROM products WHERE id = ?", [id]);
    const existingProduct = productRows[0];

    if (!existingProduct) {
      return sendError(res, "Product not found", null, 404);
    }

    const oldStock = toNumber(existingProduct.stock_qty);
    const nextStock = toNumber(stock_qty);

    await query(
      `
        UPDATE products
        SET product_name = ?,
            category = ?,
            price = ?,
            cost_price = ?,
            stock_qty = ?,
            min_stock = ?,
            image_url = ?,
            description = ?,
            stock_entry_date = ?
        WHERE id = ?
      `,
      [
        product_name,
        category || "General",
        toAmount(price),
        toAmount(cost_price || price),
        nextStock,
        toNumber(min_stock || 5),
        image_url || "",
        description || "",
        stock_entry_date || new Date().toISOString().slice(0, 10),
        id,
      ]
    );

    const stockDifference = nextStock - oldStock;
    if (stockDifference !== 0) {
      await query(
        "INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, note) VALUES (?, ?, ?, ?, ?)",
        [
          id,
          product_name,
          stockDifference > 0 ? "ADD" : "REDUCE",
          Math.abs(stockDifference),
          "Stock adjusted while editing product",
        ]
      );
    }

    res.status(200).json({ success: true, message: "Product Updated" });
  } catch (err) {
    sendError(res, "Product Update Failed", err);
  }
};

export const updateStock = async (req, res) => {
  const { id } = req.params;
  const { quantity, movement_type, note } = req.body;
  const qty = toNumber(quantity);
  const type = movement_type === "REDUCE" ? "REDUCE" : "ADD";

  if (qty <= 0) {
    return sendError(res, "Quantity must be greater than 0", null, 400);
  }

  try {
    await schemaReady;
    const rows = await query("SELECT * FROM products WHERE id = ?", [id]);
    const product = rows[0];

    if (!product) {
      return sendError(res, "Product not found", null, 404);
    }

    if (type === "REDUCE" && qty > toNumber(product.stock_qty)) {
      return sendError(res, "Reduce quantity cannot be more than available stock", null, 400);
    }

    const newQty = type === "ADD" ? toNumber(product.stock_qty) + qty : toNumber(product.stock_qty) - qty;

    await query("UPDATE products SET stock_qty = ? WHERE id = ?", [newQty, id]);
    await query(
      "INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, note) VALUES (?, ?, ?, ?, ?)",
      [id, product.product_name, type, qty, note || ""]
    );

    res.status(200).json({ success: true, message: "Stock Updated", stock_qty: newQty });
  } catch (err) {
    sendError(res, "Stock Update Failed", err);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await schemaReady;
    const orderRows = (await tableExists("shopping_order_items"))
      ? await query("SELECT id FROM shopping_order_items WHERE product_id = ? LIMIT 1", [req.params.id])
      : [];

    if (orderRows.length) {
      return sendError(res, "Product is used in shopping orders. Set stock to 0 instead of deleting.", null, 400);
    }

    await query("DELETE FROM stock_movements WHERE product_id = ?", [req.params.id]);
    await query("DELETE FROM products WHERE id = ?", [req.params.id]);
    res.status(200).json({ success: true, message: "Product Deleted" });
  } catch (err) {
    sendError(res, "Product Delete Failed", err);
  }
};

export const getStockHistory = async (req, res) => {
  try {
    await schemaReady;
    const rows = await query("SELECT * FROM stock_movements WHERE COALESCE(note, '') <> 'Opening stock' ORDER BY id DESC LIMIT 80");
    res.status(200).json(rows);
  } catch (err) {
    sendError(res, "Stock History Failed", err);
  }
};
