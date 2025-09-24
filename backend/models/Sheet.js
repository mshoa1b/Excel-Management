const pool = require('../lib/db');

const getSheets = async (business_id) => {
  const result = await pool.query('SELECT * FROM sheets WHERE business_id = $1', [business_id]);
  return result.rows;
};

const createSheet = async (sheet) => {
  const {
    business_id, date, order_no, customer_name, imei, sku, customer_comment,
    return_type, refund_amount, platform, return_within_30_days, issue, out_of_warranty
  } = sheet;
  const result = await pool.query(
    `INSERT INTO sheets (business_id,date,order_no,customer_name,imei,sku,customer_comment,return_type,refund_amount,platform,return_within_30_days,issue,out_of_warranty)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [business_id, date, order_no, customer_name, imei, sku, customer_comment, return_type, refund_amount, platform, return_within_30_days, issue, out_of_warranty]
  );
  return result.rows[0];
};

const updateSheet = async (sheet) => {
  const {
    id, business_id, date, order_no, customer_name, imei, sku, customer_comment,
    return_type, refund_amount, platform, return_within_30_days, issue, out_of_warranty
  } = sheet;
  const result = await pool.query(
    `UPDATE sheets SET date=$1, order_no=$2, customer_name=$3, imei=$4, sku=$5, customer_comment=$6, return_type=$7, refund_amount=$8, platform=$9, return_within_30_days=$10, issue=$11, out_of_warranty=$12
     WHERE id=$13 AND business_id=$14 RETURNING *`,
    [date, order_no, customer_name, imei, sku, customer_comment, return_type, refund_amount, platform, return_within_30_days, issue, out_of_warranty, id, business_id]
  );
  return result.rows[0];
};

const deleteSheet = async (id, business_id) => {
  await pool.query('DELETE FROM sheets WHERE id=$1 AND business_id=$2', [id, business_id]);
};

module.exports = { getSheets, createSheet, updateSheet, deleteSheet };
