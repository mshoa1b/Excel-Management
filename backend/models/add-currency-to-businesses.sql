-- Add currency support to businesses table
ALTER TABLE businesses 
ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD',
ADD COLUMN currency_symbol VARCHAR(5) DEFAULT '$';

-- Update existing businesses with USD as default
UPDATE businesses SET 
    currency_code = 'USD',
    currency_symbol = '$'
WHERE currency_code IS NULL OR currency_symbol IS NULL;

-- Add some common currencies for reference
-- You can update businesses to use different currencies as needed:
--
-- UPDATE businesses SET currency_code = 'EUR', currency_symbol = '€' WHERE id = 1;
-- UPDATE businesses SET currency_code = 'GBP', currency_symbol = '£' WHERE id = 2;
-- UPDATE businesses SET currency_code = 'JPY', currency_symbol = '¥' WHERE id = 3;
-- UPDATE businesses SET currency_code = 'CAD', currency_symbol = 'C$' WHERE id = 4;
-- UPDATE businesses SET currency_code = 'AUD', currency_symbol = 'A$' WHERE id = 5;