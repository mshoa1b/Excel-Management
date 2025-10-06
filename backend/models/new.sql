-- ============================================================
-- MULTI-TENANT SAAS SCHEMA (idempotent)
-- ============================================================

-- =========================
-- ENUM TYPES
-- =========================
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

-- =========================
-- CORE TABLES
-- =========================

-- Roles (type catalog)
CREATE TABLE IF NOT EXISTS roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL
);

-- Businesses (tenants)
CREATE TABLE IF NOT EXISTS businesses (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(255) UNIQUE NOT NULL,
  owner_id INT NULL REFERENCES users(id)  -- set after users exist
);

-- Users (belongs to a business)
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role_id      INT NOT NULL REFERENCES roles(id),
  business_id  INT REFERENCES businesses(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id     ON users(role_id);

-- Seed role names (don’t force specific IDs)
INSERT INTO roles(name) VALUES
  ('SuperAdmin'),
  ('BusinessAdmin'),
  ('User')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- Enforce: only ONE SuperAdmin user globally (partial unique index)
-- (Adapts to whatever ID 'SuperAdmin' has in THIS database.)
-- ============================================================
DO $$
DECLARE
  super_id INT;
BEGIN
  SELECT id INTO super_id FROM roles WHERE name = 'SuperAdmin';
  IF super_id IS NOT NULL THEN
    EXECUTE format(
      'CREATE UNIQUE INDEX IF NOT EXISTS one_superadmin_global
         ON users ((role_id))
       WHERE role_id = %s',
      super_id
    );
  END IF;
END$$;

-- =========================
-- SHEETS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS sheets (
  id SERIAL PRIMARY KEY,                            -- A Return ID
  business_id INT REFERENCES businesses(id) ON DELETE CASCADE,

  date_received DATE,                               -- B Date Received
  order_no VARCHAR(255),                            -- C Order Number
  order_date DATE,                                  -- D Order Date
  customer_name VARCHAR(255),                       -- E Customer Name
  imei VARCHAR(255),                                -- F IMEI
  sku VARCHAR(255),                                 -- G SKU / Product
  customer_comment TEXT,                            -- H Customer Comment
  multiple_return VARCHAR(50),                      -- I Multiple Return (Choose, No, 2nd Time, 3rd Time)
  apple_google_id VARCHAR(50),                      -- J Apple/Google ID (Choose, Yes, Yes-Issue raised, No)
  return_type VARCHAR(50),                          -- K Return Type (Refund, URGENT REPAIR, etc.)
  locked locked_enum DEFAULT 'No',                  -- L Locked (No, Google ID, Apple ID, PIN)
  oow_case oow_case_enum DEFAULT 'No',              -- M OOW Case (No, Damaged, Wrong Device)
  replacement_available VARCHAR(10),                -- N Replacement Available (Yes/No)
  done_by VARCHAR(255),                             -- O Done By
  blocked_by blocked_by_enum DEFAULT 'PIN Required',-- P Blocked By
  cs_comment TEXT,                                  -- Q CS Comment
  resolution VARCHAR(255),                          -- R Resolution
  refund_amount DECIMAL,                            -- S Refund Amount
  refund_date DATE,                                 -- T Refund Date
  return_tracking_no VARCHAR(255),                  -- U Return Tracking No
  platform VARCHAR(50),                             -- V Platform (calculated)
  return_within_30_days VARCHAR(3),                 -- W Yes/No (calculated)
  issue VARCHAR(50),                                -- X Issue (dropdown options)
  out_of_warranty VARCHAR(3),                       -- Y Yes/No
  additional_notes TEXT,                            -- Z Additional Notes
  status VARCHAR(50),                               -- AA Status (Pending, In Progress, Resolved)
  manager_notes TEXT,                               -- AB Manager Notes

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indices for common filters/lookups
CREATE INDEX IF NOT EXISTS idx_sheets_business_id    ON sheets(business_id);
CREATE INDEX IF NOT EXISTS idx_sheets_date_received  ON sheets(date_received);
CREATE INDEX IF NOT EXISTS idx_sheets_order_no       ON sheets(order_no);
CREATE INDEX IF NOT EXISTS idx_sheets_imei           ON sheets(imei);
CREATE INDEX IF NOT EXISTS idx_sheets_status         ON sheets(status);
CREATE INDEX IF NOT EXISTS idx_sheets_refund_date    ON sheets(refund_date);

-- Auto-update updated_at on UPDATE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sheets_set_updated_at') THEN
    CREATE OR REPLACE FUNCTION sheets_set_updated_at()
    RETURNS TRIGGER AS $F$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $F$ LANGUAGE plpgsql;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_sheets_set_updated_at'
  ) THEN
    CREATE TRIGGER trg_sheets_set_updated_at
    BEFORE UPDATE ON sheets
    FOR EACH ROW
    EXECUTE FUNCTION sheets_set_updated_at();
  END IF;
END$$;

-- =========================
-- BACK MARKET CREDENTIALS (per business)
-- =========================
CREATE TABLE IF NOT EXISTS backmarket_credentials (
  business_id    INT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  api_key_enc    TEXT NOT NULL,        -- AES-256-GCM encrypted (base64)
  api_secret_enc TEXT,                 -- optional AES-256-GCM encrypted (base64)
  updated_by     INT REFERENCES users(id),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bmcreds_updated_by ON backmarket_credentials(updated_by);

-- =========================
-- (Optional) Housekeeping for old unique index if you ever created it
-- We now allow MULTIPLE BusinessAdmins per business.
-- =========================
-- DROP INDEX IF EXISTS uniq_one_admin_per_business;

-- ============================================================
-- DONE
-- ============================================================
