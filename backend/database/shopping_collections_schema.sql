CREATE DATABASE IF NOT EXISTS smartkhata;
USE smartkhata;

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
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  movement_type ENUM('ADD', 'REDUCE', 'ORDER') NOT NULL,
  quantity INT NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(160) NOT NULL,
  mobile VARCHAR(30),
  pickup_time DATETIME NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status ENUM('Placed', 'Packing', 'Ready', 'Collected', 'Cancelled') NOT NULL DEFAULT 'Placed',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name VARCHAR(160) NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL
);

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Aashirvaad Atta 5kg', 'Flour', 280, 245, 25, 8,
  'https://placehold.co/500x360/fef3c7/92400e?text=Aashirvaad+Atta',
  'Premium wheat flour pack for daily household use.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'aashirvaad atta 5kg');

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Fortune Sunflower Oil 1L', 'Oil', 165, 142, 12, 6,
  'https://placehold.co/500x360/fff7ed/c2410c?text=Sunflower+Oil',
  'Refined sunflower oil suitable for cooking.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'fortune sunflower oil 1l');

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Tata Salt 1kg', 'Groceries', 28, 22, 8, 10,
  'https://placehold.co/500x360/e0f2fe/0369a1?text=Tata+Salt',
  'Iodized salt pack for everyday kitchen needs.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'tata salt 1kg');

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Parle-G Biscuit 200g', 'Snacks', 10, 8, 30, 12,
  'https://placehold.co/500x360/fef9c3/854d0e?text=Parle-G',
  'Classic glucose biscuit pack.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'parle-g biscuit 200g');

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Maggi Noodles', 'Snacks', 15, 12, 5, 10,
  'https://placehold.co/500x360/fef08a/a16207?text=Maggi',
  'Instant noodles pack.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'maggi noodles');

INSERT INTO products
  (product_name, category, price, cost_price, stock_qty, min_stock, image_url, description, stock_entry_date)
SELECT 'Amul Milk 500ml', 'Dairy', 32, 28, 15, 10,
  'https://placehold.co/500x360/ecfeff/0e7490?text=Amul+Milk',
  'Fresh milk pouch.', CURDATE()
WHERE NOT EXISTS (SELECT 1 FROM products WHERE LOWER(TRIM(product_name)) = 'amul milk 500ml');
