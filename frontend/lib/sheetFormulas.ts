export function computePlatform(orderNo: string): 'Back Market' | 'Amazon' | '' {
  if (!orderNo) return '';
  return /^\d{8}$/.test(orderNo) ? 'Back Market' : 'Amazon';
}

export function computeWithin30(dateReceived?: string, orderDate?: string): boolean {
  if (!dateReceived || !orderDate) return false;
  const d1 = new Date(dateReceived);
  const d2 = new Date(orderDate);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
  const diffDays = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

export function buildReturnId(orderDate?: string, rowIndex?: number): string {
  if (!orderDate || rowIndex == null) return '';
  const d = new Date(orderDate);
  if (isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const seq = String(rowIndex + 1).padStart(3, '0');
  return `RET${mm}${yy}${seq}`;
}
