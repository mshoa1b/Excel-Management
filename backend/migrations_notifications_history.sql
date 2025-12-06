-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'info', 'warning', 'success'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Sheet History Table
CREATE TABLE IF NOT EXISTS sheets_history (
    history_id SERIAL PRIMARY KEY,
    sheet_id INT REFERENCES sheets(id) ON DELETE CASCADE,
    changed_by INT REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    change_type VARCHAR(50) DEFAULT 'UPDATE',
    
    -- Snapshot Columns (Using same names as sheets table)
    date_received DATE,
    order_no VARCHAR(255),
    order_date DATE,
    customer_name VARCHAR(255),
    imei VARCHAR(255),
    sku VARCHAR(255),
    customer_comment TEXT,
    multiple_return VARCHAR(50),
    apple_google_id VARCHAR(50),
    return_type VARCHAR(50),
    locked VARCHAR(50),
    oow_case VARCHAR(50),
    replacement_available VARCHAR(10),
    done_by VARCHAR(255),
    blocked_by VARCHAR(255),
    cs_comment TEXT,
    resolution VARCHAR(255),
    refund_amount DECIMAL,
    refund_date DATE,
    return_tracking_no VARCHAR(255),
    platform VARCHAR(50),
    return_within_30_days VARCHAR(10),
    issue VARCHAR(50),
    out_of_warranty VARCHAR(20),
    additional_notes TEXT,
    status VARCHAR(50),
    manager_notes TEXT,
    changes JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_sheets_history_sheet_id ON sheets_history(sheet_id);
