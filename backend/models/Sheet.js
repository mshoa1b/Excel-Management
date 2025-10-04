const pool = require('../lib/db');

// ---------------- GET SHEETS ----------------
const getSheets = async (business_id) => {
  const result = await pool.query('SELECT * FROM sheets WHERE business_id=$1 ORDER BY date_received DESC, id DESC', [business_id]);
  return result.rows;
};

// ---------------- CREATE SHEET ----------------
const createSheet = async (sheet) => {
  const {
    business_id, date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
    replacement_available, done_by, blocked_by, cs_comment, resolution,
    refund_amount, refund_date, return_tracking_no, issue, out_of_warranty,
    additional_notes, status, manager_notes
  } = sheet;

  const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  const return_within_30_days = (date_received && order_date)
    ? Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24)) <= 30 ? 'Yes' : 'No'
    : 'No';

  const result = await pool.query(
    `INSERT INTO sheets
      (business_id, date_received, order_no, order_date, customer_name, imei, sku, customer_comment,
       multiple_return, apple_google_id, return_type, locked, oow_case, replacement_available,
       done_by, blocked_by, cs_comment, resolution, refund_amount, refund_date, return_tracking_no,
       platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
     RETURNING *`,
    [
      business_id, date_received, order_no, order_date, customer_name, imei, sku,
      customer_comment, multiple_return, apple_google_id, return_type, locked || 'No', oow_case || 'No',
      replacement_available, done_by, blocked_by, cs_comment, resolution, refund_amount, refund_date,
      return_tracking_no, platform, return_within_30_days, issue, out_of_warranty,
      additional_notes, status, manager_notes
    ]
  );

  return result.rows[0];
};

// ---------------- UPDATE SHEET ----------------
const updateSheet = async (sheet) => {
  const {
    id, business_id, date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
    replacement_available, done_by, blocked_by, cs_comment, resolution,
    refund_amount, refund_date, return_tracking_no, issue, out_of_warranty,
    additional_notes, status, manager_notes
  } = sheet;

  const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  const return_within_30_days = (date_received && order_date)
    ? Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24)) <= 30 ? 'Yes' : 'No'
    : 'No';

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
      date_received, order_no, order_date, customer_name, imei, sku, customer_comment,
      multiple_return, apple_google_id, return_type, locked || 'No', oow_case || 'No', replacement_available,
      done_by, blocked_by, cs_comment, resolution, refund_amount, refund_date,
      return_tracking_no, platform, return_within_30_days, issue, out_of_warranty,
      additional_notes, status, manager_notes, id, business_id
    ]
  );

  return result.rows[0];
};

// ---------------- DELETE SHEET ----------------
const deleteSheet = async (id, business_id) => {
  await pool.query('DELETE FROM sheets WHERE id=$1 AND business_id=$2', [id, business_id]);
};

module.exports = { getSheets, createSheet, updateSheet, deleteSheet };
