-- ===========================================
-- ENUM TYPES
-- ===========================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'locked_enum') THEN
    CREATE TYPE locked_enum AS ENUM ('No','Google ID','Apple ID','PIN');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'oow_case_enum') THEN
    CREATE TYPE oow_case_enum AS ENUM ('No','Damaged','Wrong Device');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blocked_by_enum') THEN
    CREATE TYPE blocked_by_enum AS ENUM (
      'PIN Required',
      'Code Required',
      'Apple ID Required',
      'Google ID Required',
      'Awaiting Part',
      'Awaiting Replacement',
      'Awaiting Customer',
      'Awaiting BM',
      'Awaiting G&I',
      'Awaiting Softezm'
    );
  END IF;
END$$;

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
    sku VARCHAR(255),                      -- G SKU / Product
    customer_comment TEXT,                 -- H Customer Comment
    multiple_return VARCHAR(50),           -- I Multiple Return (Choose, No, 2nd Time, 3rd Time)
    apple_google_id VARCHAR(50),           -- J Apple/Google ID (Choose, Yes, Yes-Issue raised, No)
    return_type VARCHAR(50),               -- K Return Type (Refund, URGENT REPAIR, etc.)
    locked locked_enum DEFAULT 'No',       -- NEW: L Locked (No, Google ID, Apple ID, PIN)
    oow_case oow_case_enum DEFAULT 'No',   -- NEW: M OOW Case (No, Damaged, Wrong Device)
    replacement_available VARCHAR(10),     -- N Replacement Available (Yes/No)
    done_by VARCHAR(255),                  -- O Done By
    blocked_by blocked_by_enum DEFAULT 'PIN Required', -- P Blocked By
    cs_comment TEXT,                       -- Q CS Comment
    resolution VARCHAR(255),               -- R Resolution
    refund_amount DECIMAL,                 -- S Refund Amount
    refund_date DATE,                      -- NEW: T Refund Date
    return_tracking_no VARCHAR(255),       -- U Return Tracking No
    platform VARCHAR(50),                  -- V Platform (calculated)
    return_within_30_days VARCHAR(3),     -- W Return within 30 days (Yes/No, calculated)
    issue VARCHAR(50),                     -- X Issue (dropdown options)
    out_of_warranty VARCHAR(3),            -- Y Out of Warranty (Yes/No)
    additional_notes TEXT,                 -- Z Additional Notes
    status VARCHAR(50),                    -- AA Status (Pending, In Progress, Resolved)
    manager_notes TEXT,                    -- AB Manager Notes

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX idx_sheets_business_id ON sheets(business_id);
CREATE INDEX idx_sheets_date_received ON sheets(date_received);
