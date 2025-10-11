export interface User {
  id: string;
  username: string;
  role_id: number;
  business_id?: string;
  created_at: string;
  updated_at: string;
  role: Role;
  business?: Business;
}

export interface Role {
  id: number;
  name: 'Superadmin' | 'Business Admin' | 'User';
  permissions: string[];
}

export interface Business {
  id: string;
  name: string;
  owner_id: string;
  currency_code?: string;
  currency_symbol?: string;
  created_at: string;
  updated_at: string;
}

export interface Sheet {
  id: string;
  business_id: string;
  date: string;
  order_no: string;
  customer_name: string;
  imei: string;
  sku: string;
  customer_comment: string;
  return_type: 'REFUND' | 'EXCHANGE';
  refund_amount: number;
  platform: string;
  return_within_30_days: boolean;
  issue: string;
  out_of_warranty: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  totalOrders: number;
  totalRefundAmount: number;
  uniqueOrders: number;
  averageRefundAmount: number;
  ordersWithin30Days: number;
  outOfWarrantyReturns: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}