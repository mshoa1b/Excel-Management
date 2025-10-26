const pool = require('./lib/db');

const fixSequence = async () => {
  try {
    console.log('Fixing sheets table sequence...');

    // Get current max ID
    const maxIdResult = await pool.query('SELECT MAX(id) FROM sheets');
    const maxId = maxIdResult.rows[0].max || 0;
    console.log('Current max ID in sheets table:', maxId);

    // Reset the sequence to start after the current max ID
    await pool.query("SELECT setval('sheets_id_seq', $1, false)", [maxId + 1]);
    console.log('Sequence reset to:', maxId + 1);

    // Verify the sequence
    const seqResult = await pool.query("SELECT last_value FROM sheets_id_seq");
    console.log('Sequence last_value:', seqResult.rows[0].last_value);

    console.log('Sequence fix completed successfully!');
  } catch (error) {
    console.error('Error fixing sequence:', error);
  } finally {
    await pool.end();
  }
};

fixSequence();