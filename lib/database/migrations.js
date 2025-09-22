// lib/database/migrations.js
import { SCHEMAS, INDEXES } from './schema.js';
import { logger } from '../logger.js';

export class DatabaseMigrations {
  constructor(db) {
    this.db = db;
    this.migrationsTable = 'migrations';
  }

  async init() {
    // Create migrations table if it doesn't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getExecutedMigrations() {
    try {
      const result = await this.db.all(`SELECT name FROM ${this.migrationsTable} ORDER BY id ASC`);
      return result.map(row => row.name);
    } catch (error) {
      logger.error('Error getting executed migrations', { error });
      return [];
    }
  }

  async markMigrationExecuted(name) {
    try {
      await this.db.run(`INSERT INTO ${this.migrationsTable} (name) VALUES (?)`, [name]);
      logger.info(`Migration ${name} marked as executed`);
    } catch (error) {
      logger.error(`Error marking migration ${name} as executed`, { error });
    }
  }

  async runMigration(name, up, down = null) {
    const executed = await this.getExecutedMigrations();

    if (executed.includes(name)) {
      logger.info(`Migration ${name} already executed`);
      return;
    }

    logger.info(`Running migration: ${name}`);

    try {
      await up(this.db);
      await this.markMigrationExecuted(name);
      logger.info(`Migration ${name} completed successfully`);
    } catch (error) {
      logger.error(`Migration ${name} failed`, { error });
      throw error;
    }
  }

  async rollbackMigration(name, down) {
    const executed = await this.getExecutedMigrations();

    if (!executed.includes(name)) {
      logger.info(`Migration ${name} not executed, nothing to rollback`);
      return;
    }

    logger.info(`Rolling back migration: ${name}`);

    try {
      if (down) {
        await down(this.db);
      }
      await this.db.run(`DELETE FROM ${this.migrationsTable} WHERE name = ?`, [name]);
      logger.info(`Migration ${name} rolled back successfully`);
    } catch (error) {
      logger.error(`Migration ${name} rollback failed`, { error });
      throw error;
    }
  }

  // Migration definitions
  async runInitialSchema() {
    await this.runMigration('001_initial_schema', async (db) => {
      // Create all tables
      for (const [table, schema] of Object.entries(SCHEMAS)) {
        await db.exec(schema);
        logger.info(`Created table: ${table}`);
      }

      // Create indexes
      for (const index of INDEXES) {
        await db.exec(index);
        logger.info(`Created index: ${index.split(' ')[2]}`);
      }

      // Insert default categories
      await db.run(`
        INSERT OR IGNORE INTO categories (name, slug, description, color)
        VALUES
          ('Technology', 'technology', 'Posts about technology and programming', '#3B82F6'),
          ('Design', 'design', 'Posts about design and creativity', '#10B981'),
          ('Business', 'business', 'Posts about business and entrepreneurship', '#F59E0B'),
          ('Lifestyle', 'lifestyle', 'Posts about lifestyle and personal development', '#EF4444'),
          ('General', 'general', 'General posts and discussions', '#8B5CF6')
      `);

      // Insert default admin user (for development)
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 12);

      await db.run(`
        INSERT OR IGNORE INTO users (username, email, password_hash, role, is_verified, is_active)
        VALUES ('admin', 'admin@nexus.com', ?, 'admin', 1, 1)
      `, [hashedPassword]);

      logger.info('Initial schema created with default data');
    });
  }

  async addUserProfileFields() {
    await this.runMigration('002_user_profile_fields', async (db) => {
      await db.exec(`
        ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
        ALTER TABLE users ADD COLUMN bio TEXT;
        ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
        ALTER TABLE users ADD COLUMN cover_url VARCHAR(500);
      `);

      logger.info('Added user profile fields');
    });
  }

  async addPostMetadata() {
    await this.runMigration('003_post_metadata', async (db) => {
      await db.exec(`
        ALTER TABLE posts ADD COLUMN title VARCHAR(255);
        ALTER TABLE posts ADD COLUMN excerpt TEXT;
        ALTER TABLE posts ADD COLUMN featured_image VARCHAR(500);
        ALTER TABLE posts ADD COLUMN status VARCHAR(20) DEFAULT 'published';
        ALTER TABLE posts ADD COLUMN visibility VARCHAR(20) DEFAULT 'public';
        ALTER TABLE posts ADD COLUMN allow_comments BOOLEAN DEFAULT 1;
        ALTER TABLE posts ADD COLUMN view_count INTEGER DEFAULT 0;
        ALTER TABLE posts ADD COLUMN published_at TIMESTAMP;
      `);

      logger.info('Added post metadata fields');
    });
  }

  async addCommentLikes() {
    await this.runMigration('004_comment_likes', async (db) => {
      await db.exec(`
        ALTER TABLE comments ADD COLUMN likes INTEGER DEFAULT 0;
        ALTER TABLE comments ADD COLUMN dislikes INTEGER DEFAULT 0;
      `);

      logger.info('Added comment interaction fields');
    });
  }

  async addNotificationSystem() {
    await this.runMigration('005_notification_system', async (db) => {
      await db.exec(SCHEMAS.notifications);

      // Create index for notifications
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
      `);

      logger.info('Added notification system');
    });
  }

  async runAllMigrations() {
    await this.init();

    logger.info('Running database migrations...');

    try {
      await this.runInitialSchema();
      await this.addUserProfileFields();
      await this.addPostMetadata();
      await this.addCommentLikes();
      await this.addNotificationSystem();

      logger.info('All migrations completed successfully');
    } catch (error) {
      logger.error('Migration failed', { error });
      throw error;
    }
  }
}
