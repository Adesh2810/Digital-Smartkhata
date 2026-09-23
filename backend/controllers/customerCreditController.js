import db from "../config/db.js";

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
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!isoMatch) return null;

  const [, year, month, day] = isoMatch;
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
  CREATE TABLE IF NOT EXISTS customer_credits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    credit_date DATE NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

export const addCustomerCredit = (req, res) => {
  const { customer_name, amount, credit_date, note } = req.body;
  const missing = validateRequired({ customer_name, amount, credit_date });
  const normalizedCreditDate = normalizeDate(credit_date);

  if (missing) {
    return sendError(res, `${missing[0]} is required`, null, 400);
  }

  if (!validateAmount(amount)) {
    return sendError(res, "amount must be greater than 0", null, 400);
  }

  if (!normalizedCreditDate) {
    return sendError(res, "credit_date must be a valid date", null, 400);
  }

  const sql = `
    INSERT INTO customer_credits
    (customer_name, amount, credit_date, note)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [String(customer_name).trim(), amount, normalizedCreditDate, String(note || "").trim()], (err, result) => {
    if (err) {
      return sendError(res, "Customer credit save failed", err);
    }

    res.status(201).json({
      success: true,
      message: "Customer credit added successfully",
      id: result.insertId,
    });
  });
};

export const getCustomerCredits = (req, res) => {
  const sql = `
    SELECT
      id,
      customer_name,
      amount,
      DATE_FORMAT(credit_date, '%Y-%m-%d') AS credit_date,
      note,
      created_at
    FROM customer_credits
    ORDER BY id DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      return sendError(res, "Customer credit fetch failed", err);
    }

    res.status(200).json(rows);
  });
};

export const updateCustomerCredit = (req, res) => {
  const { id } = req.params;
  const { customer_name, amount, credit_date, note } = req.body;
  const missing = validateRequired({ customer_name, amount, credit_date });
  const normalizedCreditDate = normalizeDate(credit_date);

  if (!validateId(id)) {
    return sendError(res, "Invalid customer credit id", null, 400);
  }

  if (missing) {
    return sendError(res, `${missing[0]} is required`, null, 400);
  }

  if (!validateAmount(amount)) {
    return sendError(res, "amount must be greater than 0", null, 400);
  }

  if (!normalizedCreditDate) {
    return sendError(res, "credit_date must be a valid date", null, 400);
  }

  const sql = `
    UPDATE customer_credits
    SET customer_name = ?, amount = ?, credit_date = ?, note = ?
    WHERE id = ?
  `;

  db.query(sql, [String(customer_name).trim(), amount, normalizedCreditDate, String(note || "").trim(), id], (err, result) => {
    if (err) {
      return sendError(res, "Customer credit update failed", err);
    }

    if (result.affectedRows === 0) {
      return sendError(res, "Customer credit not found", null, 404);
    }

    res.status(200).json({
      success: true,
      message: "Customer credit updated successfully",
    });
  });
};

export const deleteCustomerCredit = (req, res) => {
  const { id } = req.params;  

  if (!validateId(id)) {
    return sendError(res, "Invalid customer credit id", null, 400);
  }

  db.query("DELETE FROM customer_credits WHERE id = ?", [id], (err, result) => {
    if (err) {
      return sendError(res, "Customer credit delete failed", err);
    }

    if (result.affectedRows === 0) {
      return sendError(res, "Customer credit not found", null, 404);
    }

    res.status(200).json({
      success: true,
      message: "Customer credit deleted successfully",
    });
  });
};
