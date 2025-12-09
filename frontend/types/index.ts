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
  pendingOrders: number;
  inProgressOrders: number;
  resolvedOrders: number;
  multipleReturns?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// --- Analytics & Vision Types ---

export interface TrendData {
  date: string;
  orders: number;
  refunds: number;
  refundAmount: number;
}

export interface PlatformStat {
  platform: string;
  count: number;
  refundAmount: number;
}

export interface IssueStat {
  issue: string;
  count: number;
  percentage: number;
}

export interface ProductStat {
  sku: string;
  count: number;
  refundAmount: number;
  returnRate?: number; // Calculated on frontend if not provided
}

export interface AgentStat {
  agentName: string;
  count: number;
  refundAmount: number;
  avgResolutionTime?: number;
}

export interface Anomaly {
  id: string;
  type: 'refund_spike' | 'sku_failure' | 'agent_deviation' | 'platform_inconsistency' | 'imei_repeat' | 'attachment_missing' | 'general';
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  value?: number;
  threshold?: number;
}

export interface AdvancedStats {
  topSkus: ProductStat[];
  platformBreakdown: PlatformStat[];
  issueBreakdown: IssueStat[];
  agentPerformance: AgentStat[];
  trends: TrendData[];
  repeatedImeis?: Array<{ imei: string; count: number }>;
  attachmentStats?: { with: number; without: number };
  statusBreakdown?: Array<{ status: string; count: number }>;
  lockAnalysis?: { passcode_count: number; apple_id_count: number; google_id_count: number };
}