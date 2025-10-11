// src/api.ts
// Use relative path for production, localhost for development
const API_BASE_URL = typeof window !== 'undefined' 
  ? ''  // Use empty base since backend routes already include /api
  : "http://localhost:5000";  // Fallback for SSR

class ApiClient {
  private getAuthHeaders() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async parseError(response: Response) {
    try {
      const data = await response.json();
      return data?.message || response.statusText || "Request failed";
    } catch {
      const txt = await response.text().catch(() => "");
      return txt || response.statusText || "Request failed";
    }
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...this.getAuthHeaders(), ...(options.headers || {}) },
    });

    if (!res.ok) {
      if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }
      throw new Error(await this.parseError(res));
    }

    // handle 204 / empty body
    const text = await res.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }

  // -------- Auth --------
  login(username: string, password: string) {
    return this.request<{ token: string; user: any }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  // -------- Businesses (SuperAdmin) --------
  getBusinesses() {
    return this.request("/api/businesses");
  }

  createBusiness(name: string, initialAdmin?: { username: string; password: string }) {
    const body = initialAdmin ? { name, initial_admin: initialAdmin } : { name };
    return this.request("/api/businesses", { method: "POST", body: JSON.stringify(body) });
  }

  assignBusinessAdmin(businessId: number, userId: number) {
    return this.request(`/api/businesses/${businessId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  getBusinessUsers(businessId: number) {
    return this.request(`/api/businesses/${businessId}/users`);
  }

  // -------- Users --------
  getUsers() {
    return this.request("/api/users");
  }

  getMyBusinessUsers() {
    return this.request("/api/users/mine");
  }

  createUser(userData: { username: string; password: string; role_id: number; business_id?: number }) {
    return this.request("/api/users", { method: "POST", body: JSON.stringify(userData) });
  }

  deleteUser(userId: number) {
    return this.request(`/api/users/${userId}`, { method: "DELETE" });
  }

  setUserPassword(userId: number, newPassword: string) {
    return this.request(`/api/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ new_password: newPassword, confirm_password: newPassword }),
    });
  }

  changeMyPassword(currentPassword: string, newPassword: string) {
    return this.request(`/api/users/me/password`, {
      method: "PATCH",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: newPassword,
      }),
    });
  }

  // -------- Sheets --------
  getSheets(businessId: number | string) {
    return this.request(`/api/sheets/${businessId}`);
  }

  createSheet(businessId: number | string, sheetData: any) {
    return this.request(`/api/sheets/${businessId}`, { method: "POST", body: JSON.stringify(sheetData) });
  }

  updateSheet(businessId: number | string, sheetData: any) {
    return this.request(`/api/sheets/${businessId}`, { method: "PUT", body: JSON.stringify(sheetData) });
  }

  deleteSheet(businessId: number | string, sheetId: number | string) {
    return this.request(`/api/sheets/${businessId}`, { method: "DELETE", body: JSON.stringify({ id: sheetId }) });
  }

  // -------- Stats --------
  getStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "1y" | string = "1m") {
    return this.request(`/api/stats/${businessId}`, { method: "POST", body: JSON.stringify({ range }) });
  }

  // -------- Back Market Credentials --------
  getBackMarketCreds(businessId: number | string) {
    return this.request(`/api/businesses/${businessId}/backmarket/credentials`);
  }

  upsertBackMarketCreds(businessId: number | string, api_key: string, api_secret?: string) {
    return this.request(`/api/businesses/${businessId}/backmarket/credentials`, {
      method: "PUT",
      body: JSON.stringify({ api_key, api_secret }),
    });
  }

  deleteBackMarketCreds(businessId: number | string) {
    return this.request(`/api/businesses/${businessId}/backmarket/credentials`, { method: "DELETE" });
  }

  // -------- Back Market Orders --------
  fetchBackMarketOrder(orderNumber: string, businessIdForSuperAdmin?: number | string) {
    const q = businessIdForSuperAdmin ? `?businessId=${businessIdForSuperAdmin}` : "";
    return this.request(`/api/bmOrders/${orderNumber}${q}`);
  }
}

export const apiClient = new ApiClient();
