// Posts Service
import { apiClient } from './apiClient';

class PostsService {
  async getFeed(options = {}) {
    const { page = 1, limit = 10, userId } = options;
    
    const params = { page, limit };
    if (userId) params.userId = userId;
    
    return apiClient.get('/feed', params);
  }

  async getPost(postId) {
    return apiClient.get(`/posts/${postId}`);
  }

  async createPost(postData) {
    return apiClient.post('/posts/create', postData);
  }

  async updatePost(postId, updates) {
    return apiClient.patch(`/posts/${postId}`, updates);
  }

  async deletePost(postId) {
    return apiClient.delete(`/posts/${postId}`);
  }

  async likePost(postId) {
    return apiClient.post(`/posts/${postId}/like`);
  }

  async unlikePost(postId) {
    return apiClient.delete(`/posts/${postId}/like`);
  }

  async sharePost(postId, shareData = {}) {
    return apiClient.post(`/posts/${postId}/share`, shareData);
  }

  async getPostLikes(postId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get(`/posts/${postId}/likes`, { page, limit });
  }

  async getPostComments(postId, options = {}) {
    const { page = 1, limit = 20 } = options;
    return apiClient.get(`/posts/${postId}/comments`, { page, limit });
  }

  async addComment(postId, commentData) {
    return apiClient.post(`/posts/${postId}/comments`, commentData);
  }

  async updateComment(postId, commentId, updates) {
    return apiClient.patch(`/posts/${postId}/comments/${commentId}`, updates);
  }

  async deleteComment(postId, commentId) {
    return apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  }

  async reportPost(postId, reason) {
    return apiClient.post(`/posts/${postId}/report`, { reason });
  }

  async getBookmarkedPosts(options = {}) {
    const { page = 1, limit = 10 } = options;
    return apiClient.get('/posts/bookmarks', { page, limit });
  }

  async bookmarkPost(postId) {
    return apiClient.post(`/posts/${postId}/bookmark`);
  }

  async unbookmarkPost(postId) {
    return apiClient.delete(`/posts/${postId}/bookmark`);
  }
}

export const postsService = new PostsService();