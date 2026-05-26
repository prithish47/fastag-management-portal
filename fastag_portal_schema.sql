CREATE DATABASE fastag_portal;
USE fastag_portal;
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) NOT NULL UNIQUE,

    mobile_number VARCHAR(15) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    address TEXT,

    wallet_balance DECIMAL(10,2) DEFAULT 0.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT NOT NULL,

    vehicle_number VARCHAR(20) NOT NULL UNIQUE,

    vehicle_class VARCHAR(10) NOT NULL,

    vehicle_type VARCHAR(50),

    engine_number VARCHAR(100) NOT NULL UNIQUE,

    chassis_number VARCHAR(100) NOT NULL UNIQUE,

    fastag_id VARCHAR(50) UNIQUE,

    fastag_status VARCHAR(30) DEFAULT 'ACTIVE',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);
desc users;
desc vehicles;