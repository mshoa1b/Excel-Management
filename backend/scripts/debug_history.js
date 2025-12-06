const pool = require('../lib/db');
const { getSheetHistory } = require('../models/Sheet');

async function testFetch() {
  try {
    console.log("Testing getSheetHistory(6)...");
    const rows = await getSheetHistory(6);
    console.log("Success! Rows found:", rows.length);
    console.log("First row:", rows[0]);
  } catch (err) {
    console.error("Error executing getSheetHistory:", err);
  } finally {
    pool.end();
  }
}

testFetch();
