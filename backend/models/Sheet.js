const pool = require('../lib/db');

const getSheets = async (business_id) => {
  const result = await pool.query('SELECT * FROM sheets WHERE business_id=$1', [business_id]);
  return result.rows;
};

const createSheet = async (sheet) => {
  const {
    business_id, date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, replacement_available,
    done_by, blocked_by, cs_comment, resolution, refund_amount, return_tracking_no,
    issue, out_of_warranty, additional_notes, status, manager_notes
  } = sheet;

  // Compute platform
  let platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  // Compute return_within_30_days
  let return_within_30_days = '';
  if (date_received && order_date) {
    const diffDays = Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24));
    return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';
  }

  const result = await pool.query(
    `INSERT INTO sheets 
    (business_id, date_received, order_no, order_date, customer_name, imei, sku, customer_comment, multiple_return, apple_google_id, return_type, replacement_available, done_by, blocked_by, cs_comment, resolution, refund_amount, return_tracking_no, platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes)
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
    RETURNING *`,
    [
      business_id, date_received, order_no, order_date, customer_name, imei, sku,
      customer_comment, multiple_return, apple_google_id, return_type, replacement_available,
      done_by, blocked_by, cs_comment, resolution, refund_amount, return_tracking_no,
      platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes
    ]
  );

  return result.rows[0];
};

const updateSheet = async (sheet) => {
  const {
    id, business_id, date_received, order_no, order_date, customer_name, imei, sku,
    customer_comment, multiple_return, apple_google_id, return_type, replacement_available,
    done_by, blocked_by, cs_comment, resolution, refund_amount, return_tracking_no,
    issue, out_of_warranty, additional_notes, status, manager_notes
  } = sheet;

  // Compute platform
  let platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
  // Compute return_within_30_days
  let return_within_30_days = '';
  if (date_received && order_date) {
    const diffDays = Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24));
    return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';
  }

  const result = await pool.query(
    `UPDATE sheets SET
      date_received=$1, order_no=$2, order_date=$3, customer_name=$4, imei=$5, sku=$6, customer_comment=$7, multiple_return=$8,
      apple_google_id=$9, return_type=$10, replacement_available=$11, done_by=$12, blocked_by=$13, cs_comment=$14, resolution=$15,
      refund_amount=$16, return_tracking_no=$17, platform=$18, return_within_30_days=$19, issue=$20, out_of_warranty=$21,
      additional_notes=$22, status=$23, manager_notes=$24, updated_at=NOW()
    WHERE id=$25 AND business_id=$26
    RETURNING *`,
    [
      date_received, order_no, order_date, customer_name, imei, sku, customer_comment, multiple_return,
      apple_google_id, return_type, replacement_available, done_by, blocked_by, cs_comment, resolution,
      refund_amount, return_tracking_no, platform, return_within_30_days, issue, out_of_warranty,
      additional_notes, status, manager_notes, id, business_id
    ]
  );

  return result.rows[0];
};

const deleteSheet = async (id, business_id) => {
  await pool.query('DELETE FROM sheets WHERE id=$1 AND business_id=$2', [id, business_id]);
};

module.exports = { getSheets, createSheet, updateSheet, deleteSheet };
