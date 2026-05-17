-- Text-to-SQL 初始化脚本
-- text2sql_demo：示例业务数据库（供用户查询演练）
-- text2sql_admin：系统管理数据库（用户、数据源配置、查询历史、语义层）

CREATE DATABASE IF NOT EXISTS text2sql_demo;
CREATE DATABASE IF NOT EXISTS text2sql_admin;
USE text2sql_demo;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_price (price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(20),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    parent_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert Sample Data

-- Sample Users
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'System Admin', '13800138000', 'admin'),
('john_doe', 'john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'John Doe', '13800138001', 'user'),
('jane_smith', 'jane@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.', 'Jane Smith', '13800138002', 'user');

-- Sample Categories
INSERT INTO categories (name, description, parent_id) VALUES
('Electronics', 'Electronic devices and accessories', NULL),
('Clothing', 'Apparel and fashion', NULL),
('Books', 'Books and publications', NULL),
('Smartphones', 'Mobile phones', 1),
('Laptops', 'Laptop computers', 1),
('Men', 'Men clothing', 2),
('Women', 'Women clothing', 2);

-- Sample Products
INSERT INTO products (name, description, category, price, stock) VALUES
('iPhone 15 Pro', 'Latest Apple smartphone', 'Smartphones', 999.99, 100),
('MacBook Pro 14', 'Apple laptop with M3 chip', 'Laptops', 1999.99, 50),
('Samsung Galaxy S24', 'Samsung flagship phone', 'Smartphones', 899.99, 80),
('Dell XPS 15', 'Premium Windows laptop', 'Laptops', 1499.99, 60),
('Nike Air Max', 'Sports running shoes', 'Men', 129.99, 200),
('Levi\'s Jeans', 'Classic denim jeans', 'Men', 79.99, 150),
('Women Summer Dress', 'Light summer dress', 'Women', 89.99, 100),
('Harry Potter Box Set', 'Complete book series', 'Books', 59.99, 300);

-- Sample Orders
INSERT INTO orders (user_id, order_number, total_amount, status, payment_method, shipping_address) VALUES
(2, 'ORD-2024-001', 1129.98, 'completed', 'credit_card', '123 Main St, City, State 12345'),
(2, 'ORD-2024-002', 79.99, 'pending', 'paypal', '123 Main St, City, State 12345'),
(3, 'ORD-2024-003', 2049.98, 'shipped', 'credit_card', '456 Oak Ave, Town, State 67890');

-- Sample Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 999.99, 999.99),
(1, 3, 1, 129.99, 129.99),
(2, 6, 1, 79.99, 79.99),
(3, 2, 1, 1999.99, 1999.99),
(3, 8, 1, 59.99, 59.99);