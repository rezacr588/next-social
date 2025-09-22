// Users Service
import { apiClient } from './apiClient';

class UsersService {
  async getUser(userId) {
    return apiClient.get(`/users/${userId}`);
  }

  async getUserPosts(userId, options = {}) {
    const { page = 1, limit = 10 } = options;
    return apiClient.get(`/users/${userId}/posts`, { page, limit });
  }

  async followUser(userId) {
    return apiClient.post(`/users/${userId}/follow`);
  }

  async unfollowUser(userId) {
    return apiClient.delete(`/users/${userId}/follow`);
  }

  async getFollowers(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get(`/users/${userId}/followers`, { page, limit });
  }

  async getFollowing(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get(`/users/${userId}/following`, { page, limit });
  }

  async searchUsers(query, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get('/users/search', { q: query, page, limit });
  }

  async blockUser(userId) {
    return apiClient.post(`/users/${userId}/block`);
  }

  async unblockUser(userId) {
    return apiClient.delete(`/users/${userId}/block`);
  }

  async reportUser(userId, reason) {
    return apiClient.post(`/users/${userId}/report`, { reason });
  }

  async getBlockedUsers(options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get('/users/blocked', { page, limit });
  }

  async updateUserProfile(userId, updates) {
    return apiClient.patch(`/users/${userId}`, updates);
  }

  async uploadAvatar(userId, file) {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return fetch(`/api/users/${userId}/avatar`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${apiClient.getAuthToken()}`,
      },
    }).then(res => res.json());
  }

  async getSuggestedUsers(options = {}) {
    const { page = 1, limit = 10 } = options;
    return apiClient.get('/users/suggestions', { page, limit });
  }

  async getUserActivity(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get(`/users/${userId}/activity`, { page, limit });
  }
}

export const usersService = new UsersService();