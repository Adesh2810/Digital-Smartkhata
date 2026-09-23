import "dotenv/config";
import mysql from "mysql2";

process.on("unhandledRejection", (err) => {
  if (err?.code?.startsWith?.("ER_")) {
    console.error("Database Startup Error:", err.message);
    return;
  }

  throw err;
});

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smartkhata",
};

const createDbError = (message) => {
  const err = new Error(message);
  err.code = "ER_ACCESS_DENIED_ERROR";
  return err;
};

const isDbConfigured =
  Boolean(config.password) || process.env.DB_ALLOW_EMPTY_PASSWORD === "true";

let connection = null;

if (isDbConfigured) {
  connection = mysql.createConnection(config);

  connection.connect((err) => {
    if (err) {
      console.error("Database Connection Failed:", err.message);
      console.error(
        "Check DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME in backend/.env"
      );
      return;
    }

    console.log("MySQL Connected Successfully");
  });
} else {
  console.warn(
    "MySQL password is not configured. Backend is running, but database routes will return errors until backend/.env is updated."
  );
}

const db = {
  query(sql, params, callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    if (!connection) {
      const err = createDbError(
        "MySQL password is not configured in backend/.env"
      );
      if (callback) callback(err);
      return;
    }

    return connection.query(sql, params, callback);
  },

  beginTransaction(callback) {
    if (!connection) {
      const err = createDbError(
        "Transactions require an active MySQL connection"
      );
      if (callback) callback(err);
      return;
    }

    return connection.beginTransaction(callback);
  },

  commit(callback) {
    if (!connection) {
      if (callback) callback();
      return;
    }

    return connection.commit(callback);
  },

  rollback(callback) {
    if (!connection) {
      if (callback) callback();
      return;
    }

    return connection.rollback(callback);
  },
};

export default db;
