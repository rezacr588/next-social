// Authentication Service
import { apiClient } from './apiClient';

class AuthService {
  async login(credentials) {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      
      if (response.user) {
        this.setCurrentUser(response.user);
        if (response.token) {
          apiClient.setAuthToken(response.token);
        }
      }
      
      return response;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async register(userData) {
    try {
      const response = await apiClient.post('/auth/register', userData);
      
      if (response.user) {
        this.setCurrentUser(response.user);
        if (response.token) {
          apiClient.setAuthToken(response.token);
        }
      }
      
      return response;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearCurrentUser();
      apiClient.removeAuthToken();
    }
  }

  async getCurrentUser() {
    try {
      const user = await apiClient.get('/auth/me');
      this.setCurrentUser(user);
      return user;
    } catch (error) {
      this.clearCurrentUser();
      throw error;
    }
  }

  async updateProfile(updates) {
    try {
      const user = await apiClient.patch('/auth/profile', updates);
      this.setCurrentUser(user);
      return user;
    } catch (error) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  async changePassword(passwordData) {
    try {
      await apiClient.post('/auth/change-password', passwordData);
    } catch (error) {
      throw new Error(error.message || 'Password change failed');
    }
  }

  async requestPasswordReset(email) {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  async resetPassword(token, newPassword) {
    try {
      await apiClient.post('/auth/reset-password', { token, password: newPassword });
    } catch (error) {
      throw new Error(error.message || 'Password reset failed');
    }
  }

  getCurrentUserFromStorage() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('currentUser');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  }

  setCurrentUser(user) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('currentUser', JSON.stringify(user));
    }
  }

  clearCurrentUser() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('currentUser');
    }
  }

  isAuthenticated() {
    return !!this.getCurrentUserFromStorage() && !!apiClient.getAuthToken();
  }
}

export const authService = new AuthService();