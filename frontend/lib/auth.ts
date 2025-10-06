// src/auth.ts
import type { User } from "@/types";

const safeParse = <T>(s: string | null): T | null => {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

export const getStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  return safeParse<User>(localStorage.getItem("user"));
};

export const getStoredToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

export const storeAuth = (token: string, user: User) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const isAuthenticated = (): boolean => {
  return !!getStoredToken();
};

export const hasRole = (requiredRole: string): boolean => {
  const user = getStoredUser();
  return (user?.role?.name || "").toLowerCase() === requiredRole.toLowerCase();
};

export const canAccessBusiness = (businessId: string | number): boolean => {
  const user = getStoredUser();
  if (!user) return false;

  const meRole = (user.role?.name || "").toLowerCase();
  const meBiz = user.business_id != null ? String(user.business_id) : null;
  const target = String(businessId);

  // Superadmin can access all
  if (meRole === "superadmin") return true;

  // Business Admin & User can access only their own business
  return meBiz === target;
};
