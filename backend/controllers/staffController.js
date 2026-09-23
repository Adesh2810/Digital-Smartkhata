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
  return res.status(status).json({ success: false, message });
};

const validateId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;
const toAmount = (value) => Number(value || 0);


const columnExists = async (table, column) => {
  const rows = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
};

const addColumnIfMissing = async (table, column, definition) => {
  if (!(await columnExists(table, column))) {
    await query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
};

const ensureLegacyColumnDefault = async (table, column, definition) => {
  if (await columnExists(table, column)) {
    await query(`ALTER TABLE ${table} MODIFY COLUMN ${definition}`);
  }
};

const normalizeDate = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
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

const schemaReady = (async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS staff (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(140) NOT NULL,
      mobile VARCHAR(20) NOT NULL,
      role VARCHAR(100) NOT NULL,
      salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
      joining_date DATE NOT NULL,
      status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      address TEXT,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing("staff", "name", "name VARCHAR(140) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "staff_id", "staff_id VARCHAR(50) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "mobile", "mobile VARCHAR(20) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "email", "email VARCHAR(160) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "department", "department VARCHAR(100) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "role", "role VARCHAR(100) NOT NULL DEFAULT ''");
  await addColumnIfMissing("staff", "salary", "salary DECIMAL(12, 2) NOT NULL DEFAULT 0");
  await addColumnIfMissing("staff", "joining_date", "joining_date DATE NULL");
  await addColumnIfMissing("staff", "status", "status VARCHAR(20) NOT NULL DEFAULT 'Active'");
  await addColumnIfMissing("staff", "address", "address TEXT");
  await addColumnIfMissing("staff", "note", "note TEXT");
  await addColumnIfMissing("staff", "created_at", "created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  await addColumnIfMissing(
    "staff",
    "updated_at",
    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
  );
  await ensureLegacyColumnDefault("staff", "staff_name", "staff_name VARCHAR(140) NOT NULL DEFAULT ''");
  await ensureLegacyColumnDefault("staff", "employee_id", "employee_id VARCHAR(50) NOT NULL DEFAULT ''");
  if (await columnExists("staff", "employee_id")) {
    await query(`
      UPDATE staff
      SET staff_id = employee_id
      WHERE (staff_id IS NULL OR staff_id = '') AND employee_id IS NOT NULL AND employee_id <> ''
    `);
  }

  await query(`
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      staff_id INT NOT NULL,
      attendance_date DATE NOT NULL,
      status ENUM('Present', 'Absent', 'Half Day', 'Leave') NOT NULL DEFAULT 'Present',
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_staff_attendance (staff_id, attendance_date)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS staff_salary_payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      staff_id INT NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      month_label VARCHAR(30),
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS staff_advances (
      id INT AUTO_INCREMENT PRIMARY KEY,
      staff_id INT NOT NULL,
      advance_date DATE NOT NULL,
      amount DECIMAL(12, 2) NOT NULL,
      note TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
})();

const staffSelect = `
  SELECT
    id,
    staff_id,
    name,
    mobile,
    email,
    department,
    role,
    salary,
    DATE_FORMAT(joining_date, '%Y-%m-%d') AS joining_date,
    status,
    address,
    note,
    created_at,
    updated_at
  FROM staff
`;

const validateStaffPayload = (payload) => {
  const staffId = String(payload.staff_id || payload.employee_id || "").trim();
  const name = String(payload.name || "").trim();
  const mobile = String(payload.mobile || "").trim();
  const email = String(payload.email || "").trim();
  const department = String(payload.department || "").trim();
  const role = String(payload.role || "").trim();
  const joiningDate = normalizeDate(payload.joining_date);
  const salary = toAmount(payload.salary);
  const status = payload.status === "Inactive" ? "Inactive" : "Active";

  if (!staffId) return { error: "Staff ID is required" };
  if (!name) return { error: "Name is required" };
  if (!mobile) return { error: "Mobile is required" };
  if (!/^[0-9+\-\s()]{7,20}$/.test(mobile)) return { error: "Mobile number is invalid" };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { error: "Email address is invalid" };
  if (!department) return { error: "Department is required" };
  if (!role) return { error: "Designation is required" };
  if (salary < 0) return { error: "Salary cannot be negative" };
  if (!joiningDate) return { error: "Joining date must be a valid date" };

  return {
    data: {
      staff_id: staffId,
      name,
      mobile,
      email,
      department,
      role,
      salary,
      joining_date: joiningDate,
      status,
      address: String(payload.address || "").trim(),
      note: String(payload.note || "").trim(),
    },
  };
};

export const getStaffSummary = async (req, res) => {
  try {
    await schemaReady;
    const rows = await query(`
      SELECT
        COUNT(*) AS total_staff,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active_staff,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) AS inactive_staff,
        COALESCE(SUM(CASE WHEN status = 'Active' THEN salary ELSE 0 END), 0) AS monthly_salary
      FROM staff
    `);

    const summary = rows[0] || {};
    res.status(200).json({
      total_staff: Number(summary.total_staff || 0),
      active_staff: Number(summary.active_staff || 0),
      inactive_staff: Number(summary.inactive_staff || 0),
      monthly_salary: Number(summary.monthly_salary || 0),
    });
  } catch (err) {
    sendError(res, "Staff summary failed", err);
  }
};

export const getStaff = async (req, res) => {
  try {
    await schemaReady;
    const rows = await query(`${staffSelect} ORDER BY status ASC, name ASC`);
    res.status(200).json(rows);
  } catch (err) {
    sendError(res, "Staff fetch failed", err);
  }
};

export const getStaffById = async (req, res) => {
  if (!validateId(req.params.id)) {
    return sendError(res, "Invalid staff id", null, 400);
  }

  try {
    await schemaReady;
    const rows = await query(`${staffSelect} WHERE id = ?`, [req.params.id]);
    if (!rows.length) return sendError(res, "Staff not found", null, 404);
    res.status(200).json(rows[0]);
  } catch (err) {
    sendError(res, "Staff details failed", err);
  }
};

export const addStaff = async (req, res) => {
  const validation = validateStaffPayload(req.body);
  if (validation.error) return sendError(res, validation.error, null, 400);

  const staff = validation.data;

  try {
    await schemaReady;
    const result = await query(
      `
        INSERT INTO staff
        (staff_id, name, mobile, email, department, role, salary, joining_date, status, address, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        staff.staff_id,
        staff.name,
        staff.mobile,
        staff.email,
        staff.department,
        staff.role,
        staff.salary,
        staff.joining_date,
        staff.status,
        staff.address,
        staff.note,
      ]
    );

    res.status(201).json({ success: true, message: "Staff added", id: result.insertId });
  } catch (err) {
    sendError(res, "Staff save failed", err);
  }
};

export const updateStaff = async (req, res) => {
  if (!validateId(req.params.id)) {
    return sendError(res, "Invalid staff id", null, 400);
  }

  const validation = validateStaffPayload(req.body);
  if (validation.error) return sendError(res, validation.error, null, 400);

  const staff = validation.data;

  try {
    await schemaReady;
    const result = await query(
      `
        UPDATE staff
        SET staff_id = ?, name = ?, mobile = ?, email = ?, department = ?, role = ?, salary = ?, joining_date = ?, status = ?, address = ?, note = ?
        WHERE id = ?
      `,
      [
        staff.staff_id,
        staff.name,
        staff.mobile,
        staff.email,
        staff.department,
        staff.role,
        staff.salary,
        staff.joining_date,
        staff.status,
        staff.address,
        staff.note,
        req.params.id,
      ]
    );

    if (result.affectedRows === 0) return sendError(res, "Staff not found", null, 404);
    res.status(200).json({ success: true, message: "Staff updated" });
  } catch (err) {
    sendError(res, "Staff update failed", err);
  }
};

export const deleteStaff = async (req, res) => {
  if (!validateId(req.params.id)) {
    return sendError(res, "Invalid staff id", null, 400);
  }

  try {
    await schemaReady;
    await query("DELETE FROM staff_attendance WHERE staff_id = ?", [req.params.id]);
    await query("DELETE FROM staff_salary_payments WHERE staff_id = ?", [req.params.id]);
    await query("DELETE FROM staff_advances WHERE staff_id = ?", [req.params.id]);
    const result = await query("DELETE FROM staff WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) return sendError(res, "Staff not found", null, 404);
    res.status(200).json({ success: true, message: "Staff deleted" });
  } catch (err) {
    sendError(res, "Staff delete failed", err);
  }
};

export const addAttendance = async (req, res) => {
  const { attendance_date, status, note } = req.body;
  const attendanceDate = normalizeDate(attendance_date);
  const validStatuses = ["Present", "Absent", "Half Day", "Leave"];
  const nextStatus = validStatuses.includes(status) ? status : "Present";

  if (!validateId(req.params.id)) return sendError(res, "Invalid staff id", null, 400);
  if (!attendanceDate) return sendError(res, "Attendance date must be a valid date", null, 400);

  try {
    await schemaReady;
    const staffRows = await query("SELECT id FROM staff WHERE id = ?", [req.params.id]);
    if (!staffRows.length) return sendError(res, "Staff not found", null, 404);

    await query(
      `
        INSERT INTO staff_attendance (staff_id, attendance_date, status, note)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), note = VALUES(note)
      `,
      [req.params.id, attendanceDate, nextStatus, String(note || "").trim()]
    );

    res.status(201).json({ success: true, message: "Attendance saved" });
  } catch (err) {
    sendError(res, "Attendance save failed", err);
  }
};

export const addSalaryPayment = async (req, res) => {
  const { payment_date, amount, month_label, note } = req.body;
  const paymentDate = normalizeDate(payment_date);
  const paymentAmount = toAmount(amount);

  if (!validateId(req.params.id)) return sendError(res, "Invalid staff id", null, 400);
  if (!paymentDate) return sendError(res, "Payment date must be a valid date", null, 400);
  if (paymentAmount <= 0) return sendError(res, "Payment amount must be greater than 0", null, 400);

  try {
    await schemaReady;
    const staffRows = await query("SELECT id FROM staff WHERE id = ?", [req.params.id]);
    if (!staffRows.length) return sendError(res, "Staff not found", null, 404);

    const result = await query(
      `
        INSERT INTO staff_salary_payments (staff_id, payment_date, amount, month_label, note)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        req.params.id,
        paymentDate,
        paymentAmount,
        String(month_label || "").trim(),
        String(note || "").trim(),
      ]
    );

    res.status(201).json({ success: true, message: "Salary payment saved", id: result.insertId });
  } catch (err) {
    sendError(res, "Salary payment failed", err);
  }
};

export const addAdvancePayment = async (req, res) => {
  const { advance_date, amount, note } = req.body;
  const advanceDate = normalizeDate(advance_date);
  const advanceAmount = toAmount(amount);

  if (!validateId(req.params.id)) return sendError(res, "Invalid staff id", null, 400);
  if (!advanceDate) return sendError(res, "Advance date must be a valid date", null, 400);
  if (advanceAmount <= 0) return sendError(res, "Advance amount must be greater than 0", null, 400);

  try {
    await schemaReady;
    const staffRows = await query("SELECT id FROM staff WHERE id = ?", [req.params.id]);
    if (!staffRows.length) return sendError(res, "Staff not found", null, 404);

    const result = await query(
      "INSERT INTO staff_advances (staff_id, advance_date, amount, note) VALUES (?, ?, ?, ?)",
      [req.params.id, advanceDate, advanceAmount, String(note || "").trim()]
    );

    res.status(201).json({ success: true, message: "Advance payment saved", id: result.insertId });
  } catch (err) {
    sendError(res, "Advance payment failed", err);
  }
};

export const getStaffHistory = async (req, res) => {
  if (!validateId(req.params.id)) {
    return sendError(res, "Invalid staff id", null, 400);
  }

  try {
    await schemaReady;
    const rows = await query(
      `
        SELECT 'Attendance' AS type, id, DATE_FORMAT(attendance_date, '%Y-%m-%d') AS record_date, status, 0 AS amount, note, created_at
        FROM staff_attendance
        WHERE staff_id = ?
        UNION ALL
        SELECT 'Salary' AS type, id, DATE_FORMAT(payment_date, '%Y-%m-%d') AS record_date, month_label AS status, amount, note, created_at
        FROM staff_salary_payments
        WHERE staff_id = ?
        UNION ALL
        SELECT 'Advance' AS type, id, DATE_FORMAT(advance_date, '%Y-%m-%d') AS record_date, 'Advance Payment' AS status, amount, note, created_at
        FROM staff_advances
        WHERE staff_id = ?
        ORDER BY record_date DESC, created_at DESC
        LIMIT 120
      `,
      [req.params.id, req.params.id, req.params.id]
    );

    res.status(200).json(rows);
  } catch (err) {
    sendError(res, "Staff history failed", err);
  }
};
