-- Add address columns to businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS street1 VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS state VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country VARCHAR(50);

-- Create shipStationLabels table
CREATE TABLE IF NOT EXISTS shipStationLabels (
    id SERIAL PRIMARY KEY,
    sheet_id INT REFERENCES sheets(id) ON DELETE CASCADE,
    shipstation_order_id VARCHAR(255),
    shipstation_shipment_id VARCHAR(255),
    shipstation_label_url TEXT,
    shipstation_label_pdf_base64 TEXT,
    shipstation_tracking_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);
