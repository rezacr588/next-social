import sqlite3 from 'sqlite3';

let db;

export const initDB = async () => {
  // For now, we'll use a simple in-memory approach for testing
  // In a real application, you'd use the sqlite3.Database directly
  console.log('Database initialization simulated for testing');
  return Promise.resolve();
};

export const query = async (sql, params) => {
  // Mock implementation for testing
  console.log('Mock query:', sql, params);
  return [];
};

export const run = async (sql, params) => {
  // Mock implementation for testing
  console.log('Mock run:', sql, params);
  return { lastID: Date.now(), changes: 1 };
};

export const close = async () => {
  console.log('Database closed');
};
