const pool = require('../lib/db');
const { createSheet, getSheetHistory } = require('../models/Sheet');

async function testFlow() {
  try {
    console.log("=== STARTING TEST FLOW ===");

    // 1. Create a dummy sheet
    const dummySheet = {
      business_id: 6, // Assuming business 6 exists as per previous logs
      date_received: '2023-01-01',
      order_no: 'TEST-1234',
      order_date: '2023-01-01',
      customer_name: 'Test Debugger',
      imei: '123456789012345',
      sku: 'TEST-SKU',
      status: 'Pending',
      manager_notes: 'Debug note'
    };

    console.log("1. Creating Sheet...");
    const created = await createSheet(dummySheet, 1); // Assuming user 1 exists
    console.log("Sheet created with ID:", created.id);

    // 2. Fetch History
    console.log("2. Fetching History for Business 6...");
    const history = await getSheetHistory(6);
    
    console.log("History rows found:", history.length);
    if (history.length > 0) {
      console.log("First history item:", history[0]);
    } else {
      console.log("!!! NO HISTORY FOUND !!!");
    }

  } catch (err) {
    console.error("TEST FAILED:", err);
  } finally {
    pool.end();
  }
}

testFlow();
