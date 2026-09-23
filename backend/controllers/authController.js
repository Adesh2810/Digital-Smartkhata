import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const authSchemaReady = query(`
  CREATE TABLE IF NOT EXISTS smartkhata_register_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

/* ==========================
   REGISTER USER
========================== */

export const registerUser = async (req, res) => {
  try {
    await authSchemaReady;

    const {
      name,
      email,
      address,
      mobile,
      password,
      confirmPassword,
    } = req.body;

    // Validation

    if (
      !name ||
      !email ||
      !address ||
      !mobile ||
      !password ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // Check Existing Email

    const checkEmailQuery =
      "SELECT * FROM smartkhata_register_data WHERE email=?";

    db.query(
      checkEmailQuery,
      [email],
      async (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Database Error",
          });
        }

        if (result.length > 0) {
          return res.status(400).json({
            success: false,
            message: "Email already registered",
          });
        }

        // Hash Password

        const hashedPassword =
          await bcrypt.hash(password, 10);

        const insertQuery = `
          INSERT INTO smartkhata_register_data
          (name,email,address,mobile,password)
          VALUES (?,?,?,?,?)
        `;

        db.query(
          insertQuery,
          [
            name,
            email,
            address,
            mobile,
            hashedPassword,
          ],
          (err, data) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: "Registration Failed",
              });
            }

            return res.status(201).json({
              success: true,
              message: "Registration Successful",
            });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================
   LOGIN USER
========================== */

export const loginUser = async (req, res) => {
  try {
    await authSchemaReady;

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    const sql =
      "SELECT * FROM smartkhata_register_data WHERE email=?";

    const result = await query(sql, [email]);

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      "smartkhata_secret_key",
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ==========================
   CHANGE PASSWORD
========================== */

export const changePassword = async (req, res) => {
  try {
    await authSchemaReady;

    const { email, currentPassword, newPassword, confirmPassword } = req.body;

    if (!email || !currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New password and confirm password do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    const result = await query(
      "SELECT * FROM smartkhata_register_data WHERE email=?",
      [email]
    );

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await query(
      "UPDATE smartkhata_register_data SET password=? WHERE email=?",
      [hashedPassword, email]
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully. Please login with your new password.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
