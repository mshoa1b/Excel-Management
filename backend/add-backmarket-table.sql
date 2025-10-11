-- Add missing backmarket_credentials table to existing database
-- Run this in your Neon SQL console

CREATE TABLE IF NOT EXISTS backmarket_credentials (
    business_id    INT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    api_key_enc    TEXT NOT NULL,        -- AES-256-GCM encrypted (base64)
    api_secret_enc TEXT,                 -- optional AES-256-GCM encrypted (base64)
    updated_by     INT REFERENCES users(id),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bmcreds_updated_by ON backmarket_credentials(updated_by);