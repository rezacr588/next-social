// lib/services/serverPostsService.js
import { query, run } from '../db.js';

export const serverPostsService = {
  async getAll(options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
      userId,
      tag,
      search,
    } = options;

    const offset = (page - 1) * limit;
    let whereClause = '';
    let params = [];

    // Build WHERE clause based on filters
    const conditions = [];
    
    if (userId) {
      conditions.push('p.user_id = ?');
      params.push(userId);
    }
    
    if (search) {
      conditions.push('(p.content LIKE ? OR u.username LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get posts with user information
    const postsQuery = `
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_url,
        p.media_type,
        p.like_count,
        p.share_count,
        p.created_at,
        u.username,
        u.email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);
    const posts = await query(postsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ${whereClause}
    `;

    const countParams = params.slice(0, -2); // Remove limit and offset
    const [{ total }] = await query(countQuery, countParams);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  },

  async getById(id) {
    const posts = await query(`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.media_url,
        p.media_type,
        p.like_count,
        p.share_count,
        p.created_at,
        u.username,
        u.email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [id]);

    return posts.length > 0 ? posts[0] : null;
  },

  async create(postData) {
    const {
      content,
      title,
      tags,
      mediaUrl,
      mediaType,
      userId,
    } = postData;

    const result = await run(`
      INSERT INTO posts (user_id, content, media_url, media_type)
      VALUES (?, ?, ?, ?)
    `, [userId, content, mediaUrl || null, mediaType || 'text']);

    return this.getById(result.lastID);
  },

  async update(id, updateData, userId) {
    const { content, mediaUrl, mediaType } = updateData;

    // Verify ownership
    const post = await this.getById(id);
    if (!post || post.user_id !== userId) {
      throw new Error('Post not found or unauthorized');
    }

    await run(`
      UPDATE posts 
      SET content = ?, media_url = ?, media_type = ?
      WHERE id = ? AND user_id = ?
    `, [content, mediaUrl, mediaType, id, userId]);

    return this.getById(id);
  },

  async delete(id, userId) {
    // Verify ownership
    const post = await this.getById(id);
    if (!post || post.user_id !== userId) {
      throw new Error('Post not found or unauthorized');
    }

    const result = await run('DELETE FROM posts WHERE id = ? AND user_id = ?', [id, userId]);
    return result.changes > 0;
  },

  async like(postId, userId) {
    try {
      // Add like (will fail if already liked due to UNIQUE constraint)
      await run(`
        INSERT INTO likes (post_id, user_id)
        VALUES (?, ?)
      `, [postId, userId]);

      // Update like count
      await run(`
        UPDATE posts 
        SET like_count = like_count + 1
        WHERE id = ?
      `, [postId]);

      return true;
    } catch (error) {
      if (error.message.includes('UNIQUE constraint')) {
        return false; // Already liked
      }
      throw error;
    }
  },

  async unlike(postId, userId) {
    const result = await run(`
      DELETE FROM likes
      WHERE post_id = ? AND user_id = ?
    `, [postId, userId]);

    if (result.changes > 0) {
      // Update like count
      await run(`
        UPDATE posts 
        SET like_count = like_count - 1
        WHERE id = ?
      `, [postId]);
      return true;
    }

    return false;
  },
};