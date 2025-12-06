const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_xjLTPW7FDQl8@ep-young-sound-abq3530d-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
});

async function inspect() {
  try {
    await client.connect();

    const resTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    const tables = resTables.rows.map(r => r.table_name);
    const schema = {};

    for (const table of tables) {
      const resColumns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position;
      `, [table]);
      
      schema[table] = resColumns.rows;
    }
    
    const outputPath = path.join(__dirname, 'schema-dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
    console.log(`Schema dumped to ${outputPath}`);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}

inspect();
