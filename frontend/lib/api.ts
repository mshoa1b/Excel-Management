// src/api.ts
// Use environment variable for API base URL with proper fallbacks
const getApiBaseUrl = () => {
  // First try the environment variable (available at build time and runtime)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Fallback logic for development vs production
  if (typeof window !== 'undefined') {
    // Client-side: check if we're in production
    return window.location.hostname.includes('vercel.app')
      ? 'https://excel-management-backend.vercel.app/api'
      : '/api'; // Local development
  }

  // Server-side rendering fallback
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private getAuthHeaders(includeContentType = true) {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return {
      ...(includeContentType ? { "Content-Type": "application/json" } : {}),
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

    // Don't set Content-Type for FormData - let browser set it automatically
    const isFormData = options.body instanceof FormData;

    const res = await fetch(url, {
      ...options,
      headers: { ...this.getAuthHeaders(!isFormData), ...(options.headers || {}) },
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

      // Create a more detailed error for better handling
      const error = new Error("Request failed") as any;
      error.status = res.status;
      error.statusText = res.statusText;

      // Try to parse JSON response for additional error details
      try {
        const errorBody = await res.json();
        error.response = errorBody;
        error.message = errorBody?.message || errorBody?.error || res.statusText || "Request failed";
      } catch {
        // If not JSON, try to get text
        try {
          const errorText = await res.text();
          error.message = errorText || res.statusText || "Request failed";
        } catch {
          error.message = res.statusText || "Request failed";
        }
      }

      throw error;
    }

    // handle 204 / empty body
    const text = await res.text();
    return (text ? JSON.parse(text) : ({} as T)) as T;
  }

  // -------- Auth --------
  login(username: string, password: string) {
    return this.request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  // -------- Businesses (SuperAdmin) --------
  getBusinesses() {
    return this.request("/businesses");
  }

  createBusiness(name: string, initialAdmin?: { username: string; password: string }) {
    const body = initialAdmin ? { name, initial_admin: initialAdmin } : { name };
    return this.request("/businesses", { method: "POST", body: JSON.stringify(body) });
  }

  assignBusinessAdmin(businessId: number, userId: number) {
    return this.request(`/businesses/${businessId}/admin`, {
      method: "PATCH",
      body: JSON.stringify({ user_id: userId }),
    });
  }

  getBusinessUsers(businessId: number) {
    return this.request(`/businesses/${businessId}/users`);
  }

  getBusiness(businessId: number) {
    return this.request(`/businesses/${businessId}`);
  }

  updateBusinessCurrency(businessId: number, currency_code: string, currency_symbol: string) {
    return this.request(`/businesses/${businessId}/currency`, {
      method: "PATCH",
      body: JSON.stringify({ currency_code, currency_symbol }),
    });
  }

  // -------- Users --------
  getUsers() {
    return this.request("/users");
  }

  getMyBusinessUsers() {
    return this.request("/users/mine");
  }

  createUser(userData: { username: string; password: string; role_id: number; business_id?: number }) {
    return this.request("/users", { method: "POST", body: JSON.stringify(userData) });
  }

  deleteUser(userId: number) {
    return this.request(`/users/${userId}`, { method: "DELETE" });
  }

  setUserPassword(userId: number, newPassword: string) {
    return this.request(`/users/${userId}/password`, {
      method: "PATCH",
      body: JSON.stringify({ new_password: newPassword, confirm_password: newPassword }),
    });
  }

  changeMyPassword(currentPassword: string, newPassword: string) {
    return this.request(`/users/me/password`, {
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
    return this.request(`/sheets/${businessId}`);
  }

  createSheet(businessId: number | string, sheetData: any) {
    return this.request(`/sheets/${businessId}`, { method: "POST", body: JSON.stringify(sheetData) });
  }

  updateSheet(businessId: number | string, sheetData: any) {
    return this.request(`/sheets/${businessId}`, { method: "PUT", body: JSON.stringify(sheetData) });
  }

  deleteSheet(businessId: number | string, sheetId: number | string) {
    return this.request(`/sheets/${businessId}`, { method: "DELETE", body: JSON.stringify({ id: sheetId }) });
  }

  // -------- Stats --------
  getStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getPlatformStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/platforms`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getIssueStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/issues`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getProductStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/products`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getAgentStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/agents`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getTrendStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/trends`, { method: "POST", body: JSON.stringify({ range }) });
  }

  getRealtimeStats(businessId: number | string) {
    return this.request(`/stats/${businessId}/realtime`);
  }

  getAdvancedStats(businessId: number | string, range: "1d" | "1w" | "1m" | "3m" | "6m" | "1y" | string = "1m") {
    return this.request(`/stats/${businessId}/advanced`, { method: "POST", body: JSON.stringify({ range }) });
  }

  // -------- Back Market Credentials --------
  getBackMarketCreds(businessId: number | string) {
    return this.request(`/businesses/${businessId}/backmarket/credentials`);
  }

  upsertBackMarketCreds(businessId: number | string, api_key: string, api_secret?: string) {
    return this.request(`/businesses/${businessId}/backmarket/credentials`, {
      method: "PUT",
      body: JSON.stringify({ api_key, api_secret }),
    });
  }

  deleteBackMarketCreds(businessId: number | string) {
    return this.request(`/businesses/${businessId}/backmarket/credentials`, { method: "DELETE" });
  }

  // -------- Back Market Orders --------
  fetchBackMarketOrder(orderNumber: string, businessIdForSuperAdmin?: number | string) {
    const q = businessIdForSuperAdmin ? `?businessId=${businessIdForSuperAdmin}` : "";
    return this.request(`/bmOrders/${orderNumber}${q}`);
  }

  // -------- Attachments --------
  uploadAttachments(sheetId: number, files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    // For file uploads, we need to use fetch directly to avoid Content-Type header
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = `${API_BASE_URL}/attachments/upload/${sheetId}`;

    return fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Don't set Content-Type - let browser set it with multipart boundary
      },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) {
        if (res.status === 401) {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            window.location.href = "/login";
          }
          throw new Error("Unauthorized");
        }
        const errorMessage = await this.parseError(res);
        throw new Error(errorMessage);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : {};
    });
  }

  getAttachments(sheetId: number) {
    return this.request(`/attachments/sheet/${sheetId}`);
  }

  deleteAttachment(attachmentId: number) {
    return this.request(`/attachments/${attachmentId}`, { method: "DELETE" });
  }

  getAttachmentViewUrl(attachmentId: number) {
    const apiBase = getApiBaseUrl();
    // Remove trailing /api if present to avoid duplication
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/api/attachments/view/${attachmentId}${tokenParam}`;
  }

  getAttachmentDownloadUrl(attachmentId: number) {
    const apiBase = getApiBaseUrl();
    // Remove trailing /api if present to avoid duplication
    const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${baseUrl}/api/attachments/download/${attachmentId}${tokenParam}`;
  }

  // -------- Notifications --------
  getNotifications() {
    return this.request("/notifications");
  }

  markNotificationAsRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: "POST" });
  }

  markAllNotificationsAsRead() {
    return this.request("/notifications/read-all", { method: "POST" });
  }

  // -------- Sheet History --------
  getSheetHistory(businessId: number | string, sheetId?: number | string) {
    let url = `/sheets/${businessId}/history`;
    if (sheetId) {
      url += `?sheetId=${sheetId}`;
    }
    return this.request(url);
  }
}

export const apiClient = new ApiClient();
