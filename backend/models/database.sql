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
    id SERIAL PRIMARY KEY,                 -- A Return ID
    business_id INT REFERENCES businesses(id) ON DELETE CASCADE,

    date_received DATE,                    -- B Date Received
    order_no VARCHAR(255),                 -- C Order Number
    order_date DATE,                       -- D Order Date
    customer_name VARCHAR(255),            -- E Customer Name
    imei VARCHAR(255),                     -- F IMEI
    sku VARCHAR(255),                       -- G SKU / Product
    customer_comment TEXT,                 -- H Customer Comment
    multiple_return VARCHAR(50),           -- I Multiple Return (Choose, No, 2nd Time, 3rd Time)
    apple_google_id VARCHAR(50),           -- J Apple/Google ID (Choose, Yes, Yes-Issue raised, No)
    return_type VARCHAR(50),               -- K Return Type (Refund, URGENT REPAIR, etc.)
    replacement_available VARCHAR(10),     -- L Replacement Available (Yes/No)
    done_by VARCHAR(255),                  -- M Done By
    blocked_by VARCHAR(255),               -- N Blocked By
    cs_comment TEXT,                       -- O CS Comment
    resolution VARCHAR(255),               -- P Resolution
    refund_amount DECIMAL,                 -- Q Refund Amount
    return_tracking_no VARCHAR(255),       -- R Return Tracking No
    platform VARCHAR(50),                  -- S Platform (calculated)
    return_within_30_days VARCHAR(3),     -- T Return within 30 days (Yes/No, calculated)
    issue VARCHAR(50),                     -- U Issue (dropdown options)
    out_of_warranty VARCHAR(3),            -- V Out of Warranty (Yes/No)
    additional_notes TEXT,                 -- W Additional Notes
    status VARCHAR(50),                     -- X Status (Pending, In Progress, Resolved)
    manager_notes TEXT,                    -- Y Manager Notes

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: indexes for performance
CREATE INDEX idx_sheets_business_id ON sheets(business_id);
CREATE INDEX idx_sheets_date_received ON sheets(date_received);
-- ===========================================
-- OPTIONAL: Add indexes for performance
-- ===========================================
CREATE INDEX idx_sheets_business_id ON sheets(business_id);
CREATE INDEX idx_sheets_date ON sheets(date);
CREATE INDEX idx_users_business_id ON users(business_id);
