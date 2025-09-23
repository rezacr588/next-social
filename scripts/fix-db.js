import sqlite3 from "sqlite3";
import path from "path";

// Fix database schema - add missing columns if they don't exist
async function fixDatabase() {
  return new Promise((resolve, reject) => {
    const dbFile = path.join(process.cwd(), "nexus_social.db");
    const db = new sqlite3.Database(dbFile, (err) => {
      if (err) {
        console.error("Database connection error:", err);
        return reject(err);
      }

      console.log("🔧 Checking and fixing database schema...");

      // Check current schema
      db.all("PRAGMA table_info(posts)", (err, columns) => {
        if (err) {
          console.error("Schema check error:", err);
          return reject(err);
        }

        console.log(
          "Current posts table columns:",
          columns.map((c) => c.name)
        );

        const hasLikeCount = columns.some((col) => col.name === "like_count");
        const hasShareCount = columns.some((col) => col.name === "share_count");

        if (!hasLikeCount || !hasShareCount) {
          console.log("❌ Missing columns detected, recreating posts table...");

          // Backup data, recreate table, restore data
          db.serialize(() => {
            db.run("BEGIN TRANSACTION");

            // Backup existing posts
            db.run(
              `CREATE TABLE posts_backup AS SELECT * FROM posts`,
              (err) => {
                if (err)
                  console.log("No existing posts to backup:", err.message);
              }
            );

            // Drop and recreate posts table
            db.run("DROP TABLE IF EXISTS posts");
            db.run(`CREATE TABLE posts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              content TEXT NOT NULL,
              media_url TEXT,
              media_type TEXT,
              like_count INTEGER DEFAULT 0,
              share_count INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            )`);

            // Restore data if backup exists
            db.run(
              `INSERT INTO posts (id, user_id, content, media_url, media_type, created_at)
                    SELECT id, user_id, content, media_url, media_type, created_at 
                    FROM posts_backup`,
              (err) => {
                if (err) console.log("No data to restore:", err.message);
              }
            );

            // Clean up
            db.run("DROP TABLE IF EXISTS posts_backup");
            db.run("COMMIT");

            console.log("✅ Database schema fixed!");
            db.close();
            resolve();
          });
        } else {
          console.log("✅ Database schema is correct!");
          db.close();
          resolve();
        }
      });
    });
  });
}

// Run the fix
fixDatabase().catch(console.error);
