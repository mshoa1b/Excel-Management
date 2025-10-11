export type SheetRecord = {
  id?: number;
  business_id?: number | string;

  // Core columns
  date: string;             // Date Received
  order_no: string;         // Order Number
  order_date: string;       // Order Date
  customer_name: string;
  imei: string;
  sku: string;
  customer_comment: string;
  return_type: string;      // Refund / Replacement
  refund_amount: number;    // numeric (server casts to float)
  platform: string;         // computed
  return_within_30_days: boolean; // computed
  issue: string;
  out_of_warranty: string;

  // Optional/display-only columns
  multiple_return?: string;
  apple_google_id?: string;
  replacement_available?: string;
  done_by?: string;
  blocked_by?: string;
  cs_comment?: string;
  resolution?: string;
  return_tracking_no?: string;
  additional_notes?: string;
  status?: string;
  manager_notes?: string;
};
