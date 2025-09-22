// lib/database/schema.js
export const TABLES = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LIKES: 'likes',
  FOLLOWS: 'follows',
  NOTIFICATIONS: 'notifications',
  SESSIONS: 'sessions',
  CATEGORIES: 'categories',
  POST_CATEGORIES: 'post_categories',
  TAGS: 'tags',
  POST_TAGS: 'post_tags'
};

// User roles and permissions
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest'
};

export const PERMISSIONS = {
  CREATE_POST: 'create_post',
  EDIT_POST: 'edit_post',
  DELETE_POST: 'delete_post',
  COMMENT: 'comment',
  LIKE: 'like',
  FOLLOW: 'follow',
  UPLOAD_MEDIA: 'upload_media',
  MODERATE: 'moderate',
  ADMIN: 'admin'
};

// Database schema definitions
export const SCHEMAS = {
  [TABLES.USERS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.USERS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      bio TEXT,
      avatar_url VARCHAR(500),
      cover_url VARCHAR(500),
      role VARCHAR(20) DEFAULT '${USER_ROLES.USER}',
      is_verified BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  [TABLES.POSTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.POSTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title VARCHAR(255),
      content TEXT NOT NULL,
      excerpt TEXT,
      featured_image VARCHAR(500),
      status VARCHAR(20) DEFAULT 'published',
      visibility VARCHAR(20) DEFAULT 'public',
      allow_comments BOOLEAN DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      published_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.COMMENTS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.COMMENTS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      parent_id INTEGER,
      content TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'approved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES ${TABLES.POSTS}(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES ${TABLES.COMMENTS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.LIKES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.LIKES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      post_id INTEGER,
      comment_id INTEGER,
      type VARCHAR(20) DEFAULT 'like',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, post_id, comment_id),
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE,
      FOREIGN KEY (post_id) REFERENCES ${TABLES.POSTS}(id) ON DELETE CASCADE,
      FOREIGN KEY (comment_id) REFERENCES ${TABLES.COMMENTS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.FOLLOWS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.FOLLOWS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(follower_id, following_id),
      FOREIGN KEY (follower_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.NOTIFICATIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.NOTIFICATIONS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT,
      data JSON,
      is_read BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.SESSIONS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.SESSIONS} (
      id VARCHAR(255) PRIMARY KEY,
      user_id INTEGER NOT NULL,
      data TEXT,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES ${TABLES.USERS}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.CATEGORIES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.CATEGORIES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      color VARCHAR(7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  [TABLES.POST_CATEGORIES]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.POST_CATEGORIES} (
      post_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, category_id),
      FOREIGN KEY (post_id) REFERENCES ${TABLES.POSTS}(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES ${TABLES.CATEGORIES}(id) ON DELETE CASCADE
    )
  `,

  [TABLES.TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.TAGS} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(50) UNIQUE NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  [TABLES.POST_TAGS]: `
    CREATE TABLE IF NOT EXISTS ${TABLES.POST_TAGS} (
      post_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (post_id, tag_id),
      FOREIGN KEY (post_id) REFERENCES ${TABLES.POSTS}(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES ${TABLES.TAGS}(id) ON DELETE CASCADE
    )
  `
};

// Indexes for performance
export const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_users_email ON ${TABLES.USERS}(email)`,
  `CREATE INDEX IF NOT EXISTS idx_users_username ON ${TABLES.USERS}(username)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_user_id ON ${TABLES.POSTS}(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_created_at ON ${TABLES.POSTS}(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status ON ${TABLES.POSTS}(status)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post_id ON ${TABLES.COMMENTS}(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_user_id ON ${TABLES.COMMENTS}(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_likes_user_id ON ${TABLES.LIKES}(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_likes_post_id ON ${TABLES.LIKES}(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON ${TABLES.FOLLOWS}(follower_id)`,
  `CREATE INDEX IF NOT EXISTS idx_follows_following_id ON ${TABLES.FOLLOWS}(following_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON ${TABLES.NOTIFICATIONS}(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON ${TABLES.NOTIFICATIONS}(is_read)`
];
