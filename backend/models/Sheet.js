const pool = require('../lib/db');

// ---------------- GET SHEETS ----------------
const getSheets = async (business_id) => {
  const result = await pool.query('SELECT * FROM sheets WHERE business_id=$1 ORDER BY date_received DESC, id DESC', [business_id]);
  return result.rows;
};

// ---------------- CREATE SHEET ----------------
const createSheet = async (sheet, userId) => {
  console.log('Creating sheet with data:', JSON.stringify(sheet, null, 2));
  
  const {
    business_id, date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
    replacement_available, done_by, blocked_by, cs_comment, resolution,
    refund_amount, refund_date, return_tracking_no, issue, out_of_warranty,
    additional_notes, status, manager_notes, return_within_30_days
  } = sheet;

  const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  
  // Convert empty strings to null for date fields to prevent PostgreSQL errors
  const safeDateReceived = date_received === '' ? null : date_received;
  const safeOrderDate = order_date === '' ? null : order_date;
  const safeRefundDate = refund_date === '' ? null : refund_date;

  console.log('Date processing:', { date_received, safeDateReceived, order_date, safeOrderDate, refund_date, safeRefundDate });

  // Use provided return_within_30_days if it's already a string, otherwise calculate it
  let calculated_return_within_30_days = 'No';
  if (typeof return_within_30_days === 'string') {
    calculated_return_within_30_days = return_within_30_days;
  } else if (safeDateReceived && safeOrderDate) {
    try {
      const receivedDate = new Date(safeDateReceived);
      const orderDate = new Date(safeOrderDate);
      
      if (!isNaN(receivedDate.getTime()) && !isNaN(orderDate.getTime())) {
        const diffTime = Math.abs(receivedDate.getTime() - orderDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        calculated_return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';
        console.log('Calculated return_within_30_days:', { diffTime, diffDays, calculated_return_within_30_days });
      }
    } catch (error) {
      console.log('Error calculating return_within_30_days:', error);
      calculated_return_within_30_days = 'No';
    }
  }

  const queryParams = [
    business_id, safeDateReceived, order_no, safeOrderDate, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, locked || 'No', oow_case || 'No',
    replacement_available, done_by, blocked_by, cs_comment, resolution, refund_amount, safeRefundDate,
    return_tracking_no, platform, calculated_return_within_30_days, issue, out_of_warranty || 'Choose',
    additional_notes, status, manager_notes
  ];

  console.log('Query parameters:', queryParams);

  const result = await pool.query(
    `INSERT INTO sheets
      (business_id, date_received, order_no, order_date, customer_name, imei, sku, customer_comment,
       multiple_return, apple_google_id, return_type, locked, oow_case, replacement_available,
       done_by, blocked_by, cs_comment, resolution, refund_amount, refund_date, return_tracking_no,
       platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
     RETURNING *`,
    queryParams
  );

  const created = result.rows[0];
  console.log('Sheet created successfully:', created);

  // LOG HISTORY (CREATE)
  try {
    const changes = {}; 
    // For CREATE, everything is a change. We can either log everything or just "Created".
    // Let's log 'Created' logic or all initial values if desired. 
    // User asked for "updated values", for Create it's all new. 
    // We can leave 'changes' empty or populate with initial state. 
    // Let's leave it empty for CREATE as the snapshot has everything.

    const historyParams = [
      created.id,
      userId || null,
      'CREATE',
      created.date_received, created.order_no, created.order_date, created.customer_name, created.imei, created.sku,
      created.customer_comment, created.multiple_return, created.apple_google_id, created.return_type, created.locked, created.oow_case,
      created.replacement_available, created.done_by, created.blocked_by, created.cs_comment, created.resolution,
      created.refund_amount, created.refund_date, created.return_tracking_no, created.platform, created.return_within_30_days,
      created.issue, created.out_of_warranty, created.additional_notes, created.status, created.manager_notes,
      JSON.stringify(changes)
    ];

    await pool.query(
      `INSERT INTO sheets_history
        (sheet_id, changed_by, change_type,
         date_received, order_no, order_date, customer_name, imei, sku,
         customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
         replacement_available, done_by, blocked_by, cs_comment, resolution,
         refund_amount, refund_date, return_tracking_no, platform, return_within_30_days,
         issue, out_of_warranty, additional_notes, status, manager_notes, changes)
       VALUES
        ($1, $2, $3,
         $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25,
         $26, $27, $28, $29, $30, $31)`,
      historyParams
    );
    console.log(`History logged for new sheet ${created.id}`);
  } catch (histErr) {
    console.error("Failed to log sheet history for create:", histErr);
  }

  return created;
};

// ---------------- UPDATE SHEET ----------------
const updateSheet = async (sheet, userId) => {
  const { id, business_id } = sheet;

  if (!id || !business_id) {
    throw new Error("id and business_id are required for update");
  }

  // 1. Fetch current data to ensure we don't overwrite with nulls/old data
  const currentRes = await pool.query(
    'SELECT * FROM sheets WHERE id=$1 AND business_id=$2',
    [id, business_id]
  );

  if (currentRes.rowCount === 0) {
    throw new Error("Sheet not found");
  }

  const current = currentRes.rows[0];

  // 1.5. LOG HISTORY (Snapshot of BEFORE update)
  // 1.5. LOG HISTORY (Snapshot of BEFORE update + Diffs)
  try {
    // Calculate changes
    const changes = {};
    const fieldsToCheck = [
        'date_received', 'order_no', 'order_date', 'customer_name', 'imei', 'sku',
        'customer_comment', 'multiple_return', 'apple_google_id', 'return_type', 'locked', 'oow_case',
        'replacement_available', 'done_by', 'blocked_by', 'cs_comment', 'resolution',
        'refund_amount', 'refund_date', 'return_tracking_no', 'issue', 'out_of_warranty',
        'additional_notes', 'status', 'manager_notes'
    ];

    fieldsToCheck.forEach(key => {
        if (sheet.hasOwnProperty(key)) {
            let newVal = sheet[key];
            let oldVal = current[key];

            // Helper to safe format YYYY-MM-DD in LOCAL time (ignoring time component)
            // toISOString() uses UTC which causes 1-day shift in positive timezones.
            const toYMD = (val) => {
               if (val === null || val === undefined || val === '') return '';
               if (val instanceof Date) {
                   const y = val.getFullYear();
                   const m = String(val.getMonth() + 1).padStart(2, '0');
                   const d = String(val.getDate()).padStart(2, '0');
                   return `${y}-${m}-${d}`;
               }
               return String(val).slice(0, 10); // Handle string dates
            };

            let newValComp = newVal;
            let oldValComp = oldVal;

            if (['date_received', 'order_date', 'refund_date'].includes(key)) {
                newValComp = toYMD(newVal);
                oldValComp = toYMD(oldVal);
            } else {
                // Non-date handling
                // Treat null/undefined/empty string as equivalent
                if ((newVal === '' || newVal === null) && (oldVal === '' || oldVal === null)) return;
                
                // Handle number comparison (frontend sends number, DB might have string '50.00')
                if (typeof newVal === 'number' && typeof oldVal === 'string') {
                   // Ensure oldVal is actually numeric before casting
                   if (!isNaN(oldVal)) oldValComp = Number(oldVal);
                }
                
                // String normalization if needed
                if (typeof newValComp === 'string') newValComp = newValComp.trim();
                // oldVal via PG is usually not padded but let's be safe
                if (typeof oldValComp === 'string') oldValComp = oldValComp.trim();
            }

            if (newValComp != oldValComp) {
                // Save the pretty formatted simple strings for the UI
                changes[key] = { old: oldValComp, new: newValComp };
            }
        }
    });

    const historyParams = [
      current.id,
      userId || null, // changed_by
      'UPDATE',       // change_type
      current.date_received, current.order_no, current.order_date, current.customer_name, current.imei, current.sku,
      current.customer_comment, current.multiple_return, current.apple_google_id, current.return_type, current.locked, current.oow_case,
      current.replacement_available, current.done_by, current.blocked_by, current.cs_comment, current.resolution,
      current.refund_amount, current.refund_date, current.return_tracking_no, current.platform, current.return_within_30_days,
      current.issue, current.out_of_warranty, current.additional_notes, current.status, current.manager_notes,
      JSON.stringify(changes)
    ];

    await pool.query(
      `INSERT INTO sheets_history
        (sheet_id, changed_by, change_type,
         date_received, order_no, order_date, customer_name, imei, sku,
         customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
         replacement_available, done_by, blocked_by, cs_comment, resolution,
         refund_amount, refund_date, return_tracking_no, platform, return_within_30_days,
         issue, out_of_warranty, additional_notes, status, manager_notes, changes)
       VALUES
        ($1, $2, $3,
         $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15,
         $16, $17, $18, $19, $20,
         $21, $22, $23, $24, $25,
         $26, $27, $28, $29, $30, $31)`,
      historyParams
    );
    console.log(`History logged for sheet ${id}`);
  } catch (histErr) {
    console.error("Failed to log sheet history:", histErr);
    // We don't block the update if logging fails, but it's good to note.
  }

  // 2. Merge incoming data with current data
  // We only use fields that are present in the 'sheet' object.
  // If a field is missing in 'sheet', we keep 'current' value.
  const merged = { ...current, ...sheet };

  const {
    date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
    replacement_available, done_by, blocked_by, cs_comment, resolution,
    refund_amount, refund_date, return_tracking_no, issue, out_of_warranty,
    additional_notes, status, manager_notes
  } = merged;

  // 3. Recalculate derived fields based on MERGED data
  const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  
  let return_within_30_days = 'No';
  if (date_received && order_date) {
     try {
       const d1 = new Date(date_received);
       const d2 = new Date(order_date);
       if (!isNaN(d1) && !isNaN(d2)) {
         const diffTime = Math.abs(d1 - d2);
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';
       }
     } catch (e) { /* ignore */ }
  }

  // Convert empty strings to null for date fields to prevent PostgreSQL errors
  const safeDateReceived = date_received === '' ? null : date_received;
  const safeOrderDate = order_date === '' ? null : order_date;
  const safeRefundDate = refund_date === '' ? null : refund_date;

  const result = await pool.query(
    `UPDATE sheets SET
      date_received=$1, order_no=$2, order_date=$3, customer_name=$4, imei=$5, sku=$6, customer_comment=$7,
      multiple_return=$8, apple_google_id=$9, return_type=$10, locked=$11, oow_case=$12, replacement_available=$13,
      done_by=$14, blocked_by=$15, cs_comment=$16, resolution=$17, refund_amount=$18, refund_date=$19,
      return_tracking_no=$20, platform=$21, return_within_30_days=$22, issue=$23, out_of_warranty=$24,
      additional_notes=$25, status=$26, manager_notes=$27, updated_at=NOW()
    WHERE id=$28 AND business_id=$29
    RETURNING *`,
    [
      safeDateReceived, order_no, safeOrderDate, customer_name, imei, sku, customer_comment,
      multiple_return, apple_google_id, return_type, locked || 'No', oow_case || 'No', replacement_available,
      done_by, blocked_by, cs_comment, resolution, refund_amount, safeRefundDate,
      return_tracking_no, platform, return_within_30_days, issue, out_of_warranty || 'Choose',
      additional_notes, status, manager_notes, id, business_id
    ]
  );

  return result.rows[0];
};

// ---------------- DELETE SHEET ----------------
const deleteSheet = async (id, business_id) => {
  await pool.query('DELETE FROM sheets WHERE id=$1 AND business_id=$2', [id, business_id]);
};

// ---------------- GET HISTORY ----------------
const getSheetHistory = async (businessId, sheetId = null) => {
  // changed_at is TIMESTAMP without time zone (stored as UTC). 
  // We cast it to TIMESTAMPTZ by specifying it's in UTC, so 'pg' parses it correctly as absolute time.
  let query = `
    SELECT h.*, 
           (h.changed_at AT TIME ZONE 'UTC') as changed_at,
           u.username as changed_by_name,
           s.order_no as current_order_no, s.customer_name as current_customer_name
    FROM sheets_history h
    JOIN sheets s ON h.sheet_id = s.id
    LEFT JOIN users u ON h.changed_by = u.id
    WHERE s.business_id = $1
  `;
  
  const params = [businessId];

  if (sheetId) {
    query += ` AND h.sheet_id = $2`;
    params.push(sheetId);
  }

  query += ` ORDER BY h.changed_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

module.exports = { getSheets, createSheet, updateSheet, deleteSheet, getSheetHistory };
