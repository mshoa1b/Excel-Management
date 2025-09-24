const API_BASE_URL = 'http://localhost:5000';

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'An error occurred');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  // Authentication
  async login(username: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // Business Management
  async getBusinesses() {
    return this.request('/api/businesses');
  }

  async createBusiness(name: string, owner_id: string) {
    return this.request('/api/businesses', {
      method: 'POST',
      body: JSON.stringify({ name, owner_id }),
    });
  }

  // User Management
  async getUsers() {
    return this.request('/api/users');
  }

  async createUser(userData: any) {
    return this.request('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Sheet Management
  async getSheets(businessId: string) {
    return this.request(`/api/sheets/${businessId}`);
  }

  async createSheet(businessId: string, sheetData: any) {
    return this.request(`/api/sheets/${businessId}`, {
      method: 'POST',
      body: JSON.stringify(sheetData),
    });
  }

  async updateSheet(businessId: string, sheetData: any) {
    return this.request(`/api/sheets/${businessId}`, {
      method: 'PUT',
      body: JSON.stringify(sheetData),
    });
  }

  async deleteSheet(businessId: string, sheetId: string) {
    return this.request(`/api/sheets/${businessId}`, {
      method: 'DELETE',
      body: JSON.stringify({ id: sheetId }),
    });
  }

  // Stats
  async getStats(businessId: string, range: string) {
    return this.request(`/api/stats/${businessId}`, {
      method: 'POST',
      body: JSON.stringify({ range }),
    });
  }
}

export const apiClient = new ApiClient();