import { initDB } from '../lib/db.js';

async function main() {
  try {
    await initDB();
    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

main();
