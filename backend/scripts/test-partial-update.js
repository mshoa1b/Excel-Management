const pool = require('../lib/db');
const { createSheet, updateSheet, deleteSheet } = require('../models/Sheet');

async function testPartialUpdate() {
  console.log('Starting Partial Update Test...');

  // 1. Create a test business (mock ID, assuming 1 exists or we use a safe one)
  // For safety, we'll just try to use business_id 1. If it doesn't exist, this might fail, 
  // but usually there's at least one business.
  const businessId = 1; 

  // 2. Create a test sheet
  const initialData = {
    business_id: businessId,
    date_received: '2023-01-01',
    order_no: 'TEST1234',
    customer_name: 'Test User',
    status: 'Pending',
    customer_comment: 'Initial Comment'
  };

  let sheet;
  try {
    sheet = await createSheet(initialData);
    console.log('Created sheet:', sheet.id);
  } catch (e) {
    console.error('Failed to create sheet (ensure business_id 1 exists):', e.message);
    process.exit(1);
  }

  try {
    // 3. Simulate User A: Updates Status to 'Resolved'
    // User A only sends { id, business_id, status }
    console.log('User A updating status to Resolved...');
    await updateSheet({
      id: sheet.id,
      business_id: businessId,
      status: 'Resolved'
    });

    // 4. Simulate User B: Updates Comment to 'Updated Comment'
    // User B only sends { id, business_id, customer_comment }
    // Crucially, User B does NOT send 'status', so if the backend works, status should stay 'Resolved'.
    console.log('User B updating comment...');
    await updateSheet({
      id: sheet.id,
      business_id: businessId,
      customer_comment: 'Updated Comment'
    });

    // 5. Verify Final State
    const res = await pool.query('SELECT * FROM sheets WHERE id=$1', [sheet.id]);
    const finalSheet = res.rows[0];

    console.log('Final Sheet State:', {
      status: finalSheet.status,
      customer_comment: finalSheet.customer_comment
    });

    if (finalSheet.status === 'Resolved' && finalSheet.customer_comment === 'Updated Comment') {
      console.log('✅ SUCCESS: Partial updates worked! Status is Resolved and Comment is Updated.');
    } else {
      console.error('❌ FAILED: Data mismatch.');
      if (finalSheet.status !== 'Resolved') console.error('   - Status reverted or not updated (Expected: Resolved, Got: ' + finalSheet.status + ')');
      if (finalSheet.customer_comment !== 'Updated Comment') console.error('   - Comment not updated');
    }

  } catch (e) {
    console.error('Test Error:', e);
  } finally {
    // Cleanup
    await deleteSheet(sheet.id, businessId);
    console.log('Cleaned up test sheet.');
    pool.end();
  }
}

testPartialUpdate();
