-- Migration: Add Enquiries System Tables
-- Run this after the main database.sql setup

-- ===========================================
-- ENQUIRIES TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS enquiries (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'Awaiting Business', -- 'Awaiting Business', 'Awaiting Techezm', 'Resolved'
    enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    order_number VARCHAR(255),
    platform VARCHAR(50), -- 'amazon', 'backmarket'
    description TEXT CHECK (char_length(description) <= 2000),
    business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ENQUIRY MESSAGES TABLE (Conversation Trail)
-- ===========================================
CREATE TABLE IF NOT EXISTS enquiry_messages (
    id SERIAL PRIMARY KEY,
    enquiry_id INT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachments JSON, -- Store array of file paths/names
    created_by INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ADD INDEXES FOR PERFORMANCE
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_enquiries_business_id ON enquiries(business_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiry_messages_enquiry_id ON enquiry_messages(enquiry_id);

-- ===========================================
-- SAMPLE DATA (Optional - for testing)
-- ===========================================
-- Uncomment the following lines to add sample data:

-- INSERT INTO enquiries (status, order_number, platform, description, business_id, created_by) 
-- VALUES 
-- ('Awaiting Techezm', 'AMZ-123456789', 'amazon', 'Customer is reporting that the device is not turning on after receiving it. Need technical support for diagnosis.', 1, 2),
-- ('Awaiting Business', 'BM-987654321', 'backmarket', 'We need clarification on the refund process for this return. Customer provided incomplete return information.', 2, 1),
-- ('Resolved', 'AMZ-555666777', 'amazon', 'Issue with product packaging resolved. Replacement sent to customer.', 1, 2);

-- INSERT INTO enquiry_messages (enquiry_id, message, created_by)
-- VALUES
-- (1, 'Customer is reporting that the device is not turning on after receiving it. Need technical support for diagnosis.', 2),
-- (1, 'Can you provide the IMEI number and any error messages displayed?', 1),
-- (1, 'IMEI: 123456789012345. No error messages, just completely unresponsive.', 2),
-- (2, 'We need clarification on the refund process for this return. Customer provided incomplete return information.', 1),
-- (2, 'What specific information is missing? We can reach out to the customer.', 2),
-- (3, 'Issue with product packaging resolved. Replacement sent to customer.', 2),
-- (3, 'Thank you for the quick resolution!', 1);