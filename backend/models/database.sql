-- ===========================================
-- CREATE DATABASE
-- ===========================================
-- Run this separately if database does not exist
-- CREATE DATABASE saas_system;
-- \c saas_system;

-- ===========================================
-- ROLES TABLE
-- ===========================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    permissions TEXT[] DEFAULT '{}'
);

-- ===========================================
-- USERS TABLE
-- ===========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id),
    business_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- BUSINESSES TABLE
-- ===========================================
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id INT REFERENCES users(id) ON DELETE CASCADE
);

-- Link users to businesses (update foreign key after users & businesses created)
ALTER TABLE users
ADD CONSTRAINT fk_business
FOREIGN KEY (business_id)
REFERENCES businesses(id)
ON DELETE SET NULL;

-- ===========================================
-- SHEETS TABLE
-- ===========================================
CREATE TABLE sheets (
    id SERIAL PRIMARY KEY,
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,
    date DATE,
    order_no VARCHAR(255),
    customer_name VARCHAR(255),
    imei VARCHAR(255),
    sku VARCHAR(255),
    customer_comment TEXT,
    return_type VARCHAR(255),
    refund_amount DECIMAL,
    platform VARCHAR(255),
    return_within_30_days BOOLEAN,
    issue VARCHAR(255),
    out_of_warranty BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- OPTIONAL: Add indexes for performance
-- ===========================================
CREATE INDEX idx_sheets_business_id ON sheets(business_id);
CREATE INDEX idx_sheets_date ON sheets(date);
CREATE INDEX idx_users_business_id ON users(business_id);
