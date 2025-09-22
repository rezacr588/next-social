import { query } from '../db.js';

export class SimpleSearchService {
  static async searchPosts(searchQuery, { page = 1, limit = 10 } = {}) {
    if (!searchQuery?.trim()) return [];
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    // Simple text search in posts content
    const searchTerm = `%${searchQuery.trim()}%`;
    
    try {
      const posts = await query(
        `SELECT p.id, p.user_id, p.content, p.media_url, p.media_type, p.created_at, p.like_count, p.share_count, u.username
         FROM posts p
         JOIN users u ON u.id = p.user_id
         WHERE p.content LIKE ?
         ORDER BY p.created_at DESC
         LIMIT ? OFFSET ?`,
        [searchTerm, limitNum, offset]
      );
      
      return posts;
    } catch (error) {
      console.error('Search posts error:', error);
      return [];
    }
  }

  static async searchUsers(searchQuery, { page = 1, limit = 10 } = {}) {
    if (!searchQuery?.trim()) return [];
    
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;
    
    // Simple text search in username and email
    const searchTerm = `%${searchQuery.trim()}%`;
    
    try {
      const users = await query(
        `SELECT id, username, email, created_at
         FROM users
         WHERE username LIKE ? OR email LIKE ?
         ORDER BY username
         LIMIT ? OFFSET ?`,
        [searchTerm, searchTerm, limitNum, offset]
      );
      
      return users;
    } catch (error) {
      console.error('Search users error:', error);
      return [];
    }
  }

  static async search(searchQuery, options = {}) {
    const { type = 'all', ...searchOptions } = options;
    
    if (type === 'posts') {
      return { posts: await this.searchPosts(searchQuery, searchOptions) };
    }
    
    if (type === 'users') {
      return { users: await this.searchUsers(searchQuery, searchOptions) };
    }
    
    // Search all types
    const [posts, users] = await Promise.all([
      this.searchPosts(searchQuery, { ...searchOptions, limit: 5 }),
      this.searchUsers(searchQuery, { ...searchOptions, limit: 5 })
    ]);
    
    return { posts, users };
  }
}

export default SimpleSearchService;