import { User } from '@/types';

export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

export const storeAuth = (token: string, user: User) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

export const hasRole = (requiredRole: string): boolean => {
  const user = getStoredUser();
  return user?.role?.name === requiredRole;
};

export const canAccessBusiness = (businessId: string): boolean => {
  const user = getStoredUser();
  if (!user) return false;
  
  // Superadmin can access all businesses
  if (user.role.name === 'Superadmin') return true;
  
  // Business admin can access their own business
  if (user.role.name === 'Business Admin' && user.business_id === businessId) return true;
  
  // Users can access their business
  if (user.role.name === 'User' && user.business_id === businessId) return true;
  
  return false;
};