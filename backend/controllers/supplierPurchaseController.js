import db from "../config/db.js";

const toAmount = (value) => Number(value || 0);

const sendError = (res, message, err, status = 500) => {
  if (err) {
    console.log(message, err);
  }

  return res.status(status).json({
    success: false,
    message,
  });
};

const validateRequired = (fields) =>
  Object.entries(fields).find(([, value]) => value === undefined || value === null || value === "");

const validateAmount = (amount) => Number.isFinite(Number(amount)) && Number(amount) > 0;
const validateId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const normalizeDate = (value) => {
  const raw = String(value || "").trim();
  let year;
  let month;
  let day;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const localMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  if (isoMatch) {
    [, year, month, day] = isoMatch;
  } else if (localMatch) {
    [, day, month, year] = localMatch;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
  } else {
    return null;
  }

  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${year}-${month}-${day}`;
};

db.query(`
  CREATE TABLE IF NOT EXISTS supplier_purchases (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(120) NOT NULL,
    purchase_from VARCHAR(120),
    amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    bill_no VARCHAR(80) NOT NULL,
    purchase_date DATE NOT NULL,
    product_details TEXT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

db.query(`
  CREATE TABLE IF NOT EXISTS supplier (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    bill_no VARCHAR(50),
    purchase_date DATE,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

const ensureSupplierPurchaseColumn = (name, definition) => {
  db.query("SHOW COLUMNS FROM supplier_purchases LIKE ?", [name], (err, rows) => {
    if (err || rows.length > 0) return;

    db.query(`ALTER TABLE supplier_purchases ADD COLUMN ${name} ${definition}`, (alterErr) => {
      if (alterErr) {
        console.log(`Unable to add supplier_purchases.${name}`, alterErr);
      }
    });
  });
};

ensureSupplierPurchaseColumn("purchase_from", "VARCHAR(120)");
ensureSupplierPurchaseColumn("paid_amount", "DECIMAL(12, 2) DEFAULT 0");
ensureSupplierPurchaseColumn("product_details", "TEXT");

const syncSupplierRow = ({ id, supplier_name, amount, bill_no, purchase_date, note }, callback = () => {}) => {
  const sql = `
    INSERT INTO supplier (id, supplier_name, amount, bill_no, purchase_date, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      supplier_name = VALUES(supplier_name),
      amount = VALUES(amount),
      bill_no = VALUES(bill_no),
      purchase_date = VALUES(purchase_date),
      note = VALUES(note)
  `;

  db.query(
    sql,
    [
      id,
      String(supplier_name).trim().slice(0, 100),
      amount,
      String(bill_no || "").trim().slice(0, 50),
      purchase_date,
      String(note || "").trim(),
    ],
    callback
  );
};

const deleteSupplierRow = (id, callback = () => {}) => {
  db.query("DELETE FROM supplier WHERE id = ?", [id], callback);
};

export const getSupplierPurchaseSummary = (req, res) => {
  const sql = `
    SELECT
      COALESCE(SUM(amount), 0) AS total_supplier_debit,
      COALESCE(SUM(amount - COALESCE(paid_amount, 0)), 0) AS total_supplier_pending,
      COALESCE(SUM(paid_amount), 0) AS total_supplier_paid
    FROM supplier_purchases
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return sendError(res, "Supplier summary fetch failed", err);
    }

    const summary = rows[0] || {};

    res.status(200).json({
      total_supplier_debit: toAmount(summary.total_supplier_debit),
      total_supplier_pending: toAmount(summary.total_supplier_pending),
      total_supplier_paid: toAmount(summary.total_supplier_paid),
    });
  });
};

export const addSupplierPurchase = (req, res) => {
  const { supplier_name, purchase_from, amount, paid_amount, bill_no, purchase_date, product_details, note } = req.body;
  const missing = validateRequired({ supplier_name, amount, bill_no, purchase_date });
  const normalizedPurchaseDate = normalizeDate(purchase_date);

  if (missing) {
    return sendError(res, `${missing[0]} is required`, null, 400);
  }

  if (!validateAmount(amount)) {
    return sendError(res, "amount must be greater than 0", null, 400);
  }

  const paid = Number(paid_amount || 0);
  if (paid < 0 || paid > Number(amount)) {
    return sendError(res, "paid_amount must be between 0 and amount", null, 400);
  }

  if (!normalizedPurchaseDate) {
    return sendError(res, "purchase_date must be a valid date", null, 400);
  }

  const sql = `
    INSERT INTO supplier_purchases
    (supplier_name, purchase_from, amount, paid_amount, bill_no, purchase_date, product_details, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      String(supplier_name).trim(),
      String(purchase_from || "").trim(),
      amount,
      paid,
      String(bill_no).trim(),
      normalizedPurchaseDate,
      String(product_details || "").trim(),
      String(note || "").trim(),
    ],
    (err, result) => {
      if (err) {
        return sendError(res, "Purchase save failed", err);
      }

      syncSupplierRow({
        id: result.insertId,
        supplier_name,
        amount,
        bill_no,
        purchase_date: normalizedPurchaseDate,
        note,
      }, (syncErr) => {
        if (syncErr) {
          return sendError(res, "Purchase saved, but supplier table sync failed", syncErr);
        }

        res.status(201).json({
          success: true,
          message: "Purchase added successfully",
          id: result.insertId,
        });
      });
    }
  );
};

export const getSupplierPurchases = (req, res) => {
  const sql = `
    SELECT
      id,
      supplier_name,
      purchase_from,
      amount,
      paid_amount,
      bill_no,
      DATE_FORMAT(purchase_date, '%Y-%m-%d') AS purchase_date,
      product_details,
      note,
      created_at,
      (amount - COALESCE(paid_amount, 0)) AS pending_amount
    FROM supplier_purchases
    ORDER BY id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return sendError(res, "Purchase fetch failed", err);
    }

    res.status(200).json(rows);
  });
};

export const updateSupplierPurchase = (req, res) => {
  const { id } = req.params;
  const { supplier_name, purchase_from, amount, paid_amount, bill_no, purchase_date, product_details, note } = req.body;
  const missing = validateRequired({ supplier_name, amount, bill_no, purchase_date });
  const normalizedPurchaseDate = normalizeDate(purchase_date);

  if (!validateId(id)) {
    return sendError(res, "Invalid purchase id", null, 400);
  }

  if (missing) {
    return sendError(res, `${missing[0]} is required`, null, 400);
  }

  if (!validateAmount(amount)) {
    return sendError(res, "amount must be greater than 0", null, 400);
  }

  const paid = Number(paid_amount || 0);
  if (paid < 0 || paid > Number(amount)) {
    return sendError(res, "paid_amount must be between 0 and amount", null, 400);
  }

  if (!normalizedPurchaseDate) {
    return sendError(res, "purchase_date must be a valid date", null, 400);
  }

  const sql = `
    UPDATE supplier_purchases
    SET supplier_name = ?, purchase_from = ?, amount = ?, paid_amount = ?, bill_no = ?, purchase_date = ?, product_details = ?, note = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      String(supplier_name).trim(),
      String(purchase_from || "").trim(),
      amount,
      paid,
      String(bill_no).trim(),
      normalizedPurchaseDate,
      String(product_details || "").trim(),
      String(note || "").trim(),
      id,
    ],
    (err, result) => {
      if (err) {
        return sendError(res, "Purchase update failed", err);
      }

      if (result.affectedRows === 0) {
        return sendError(res, "Purchase not found", null, 404);
      }

      syncSupplierRow({
        id,
        supplier_name,
        amount,
        bill_no,
        purchase_date: normalizedPurchaseDate,
        note,
      }, (syncErr) => {
        if (syncErr) {
          return sendError(res, "Purchase updated, but supplier table sync failed", syncErr);
        }

        res.status(200).json({
          success: true,
          message: "Purchase updated successfully",
        });
      });
    }
  );
};

export const deleteSupplierPurchase = (req, res) => {
  const { id } = req.params;

  if (!validateId(id)) {
    return sendError(res, "Invalid purchase id", null, 400);
  }

  db.query("DELETE FROM supplier_purchases WHERE id = ?", [id], (err, result) => {
    if (err) {
      return sendError(res, "Purchase delete failed", err);
    }

    if (result.affectedRows === 0) {
      return sendError(res, "Purchase not found", null, 404);
    }

    deleteSupplierRow(id, (syncErr) => {
      if (syncErr) {
        return sendError(res, "Purchase deleted, but supplier table sync failed", syncErr);
      }

      res.status(200).json({
        success: true,
        message: "Purchase deleted successfully",
      });
    });
  });
};
