// lib/database/index.js - Modern Database Layer with Advanced Patterns
const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const { logger } = require('../logger.js');
const { retry, memoize, measurePerformance } = require('../utils/index.js');

class DatabaseManager {
  constructor(config = {}) {
    this.config = {
      databasePath: config.databasePath || './nexus_social.db',
      verbose: config.verbose || false,
      ...config
    };

    this.db = null;
    this.isInitialized = false;

    // Memoize expensive operations
    this.getCachedQuery = memoize(this.executeQuery.bind(this), (sql, params) => `${sql}:${JSON.stringify(params || [])}`);
  }

  async initialize() {
    if (this.isInitialized) return this.db;

    try {
      return await measurePerformance('Database Initialization', async () => {
        this.db = new sqlite3.Database(this.config.databasePath);

        // Enable foreign keys
        await this.run('PRAGMA foreign_keys = ON');

        // Enable WAL mode for better performance
        await this.run('PRAGMA journal_mode = WAL');

        // Set synchronous mode to NORMAL for better performance
        await this.run('PRAGMA synchronous = NORMAL');

        if (this.config.verbose) {
          logger.info('Database initialized with verbose logging', { path: this.config.databasePath });
        }

        this.isInitialized = true;
        return this.db;
      });
    } catch (error) {
      logger.error('Database initialization failed', { error });
      throw error;
    }
  }

  // Advanced query execution with caching and retry logic
  async executeQuery(sql, params = []) {
    await this.initialize();

    return await retry(async () => {
      try {
        const result = await this.all(sql, params);
        logger.debug('Query executed successfully', { sql: sql.substring(0, 100), params });
        return result;
      } catch (error) {
        logger.error('Query execution failed', { error, sql: sql.substring(0, 100) });
        throw error;
      }
    }, 3, 1000);
  }

  // Advanced transaction handling with modern patterns
  async withTransaction(callback) {
    await this.initialize();

    return new Promise(async (resolve, reject) => {
      try {
        await this.run('BEGIN TRANSACTION');

        const result = await callback(this);

        await this.run('COMMIT');
        resolve(result);
      } catch (error) {
        await this.run('ROLLBACK');
        reject(error);
      }
    });
  }

  // Advanced batch operations with progress tracking
  async batchExecute(queries) {
    await this.initialize();

    return await this.withTransaction(async (db) => {
      const results = [];

      for (const [index, query] of queries.entries()) {
        try {
          const result = await this.run(query.sql, query.params || []);
          results.push({ index, result, success: true });

          // Progress logging for large batches
          if (index % 10 === 0) {
            logger.debug(`Batch execution progress: ${index + 1}/${queries.length}`);
          }
        } catch (error) {
          logger.error(`Batch execution failed at index ${index}`, { error, query: query.sql.substring(0, 100) });
          results.push({ index, error, success: false });
        }
      }

      return results;
    });
  }

  // Advanced search with full-text search capabilities
  async search(table, searchTerm, options = {}) {
    const {
      columns = ['*'],
      limit = 20,
      offset = 0,
      orderBy = 'created_at DESC',
      filters = {}
    } = options;

    const searchColumns = ['title', 'content', 'description', 'name', 'username', 'email'];
    const conditions = [];
    const params = [];

    // Full-text search conditions
    searchColumns.forEach(column => {
      conditions.push(`${column} LIKE ?`);
      params.push(`%${searchTerm}%`);
    });

    // Additional filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' OR ')}` : '';

    const sql = `
      SELECT ${columns.join(', ')}
      FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    return await this.getCachedQuery(sql, params);
  }

  // Advanced aggregation with modern grouping
  async aggregate(table, options = {}) {
    const {
      groupBy,
      aggregations = {},
      filters = {},
      orderBy = 'count DESC',
      limit = 10
    } = options;

    const aggFunctions = [];
    const columns = [];

    Object.entries(aggregations).forEach(([field, func]) => {
      switch (func) {
        case 'count':
          aggFunctions.push(`COUNT(${field}) as ${field}_count`);
          columns.push(`${field}_count`);
          break;
        case 'sum':
          aggFunctions.push(`SUM(${field}) as ${field}_sum`);
          columns.push(`${field}_sum`);
          break;
        case 'avg':
          aggFunctions.push(`AVG(${field}) as ${field}_avg`);
          columns.push(`${field}_avg`);
          break;
        case 'min':
          aggFunctions.push(`MIN(${field}) as ${field}_min`);
          columns.push(`${field}_min`);
          break;
        case 'max':
          aggFunctions.push(`MAX(${field}) as ${field}_max`);
          columns.push(`${field}_max`);
          break;
      }
    });

    const conditions = [];
    const params = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const groupByClause = groupBy ? `GROUP BY ${groupBy}` : '';
    const orderByClause = orderBy ? `ORDER BY ${orderBy}` : '';

    const sql = `
      SELECT ${groupBy ? `${groupBy}, ` : ''}${aggFunctions.join(', ')}
      FROM ${table}
      ${whereClause}
      ${groupByClause}
      ${orderByClause}
      LIMIT ?
    `;

    params.push(limit);

    return await this.executeQuery(sql, params);
  }

  // Advanced pagination with cursor-based pagination
  async paginate(table, options = {}) {
    const {
      cursor,
      limit = 20,
      orderBy = 'created_at DESC',
      filters = {}
    } = options;

    const conditions = [];
    const params = [];

    if (cursor) {
      conditions.push('id < ?');
      params.push(cursor);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT * FROM ${table}
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    params.push(limit);

    const results = await this.executeQuery(sql, params);

    return {
      data: results,
      hasNextPage: results.length === limit,
      nextCursor: results.length > 0 ? results[results.length - 1].id : null
    };
  }

  // Advanced relationship loading with eager loading simulation
  async withRelations(query, relations) {
    const results = await this.executeQuery(query.sql, query.params || []);

    if (results.length === 0) return results;

    // Simulate eager loading for related data
    for (const result of results) {
      for (const relation of relations) {
        const relatedQuery = this.buildRelationQuery(result.id, relation);
        result[relation.name] = await this.executeQuery(relatedQuery.sql, relatedQuery.params);
      }
    }

    return results;
  }

  buildRelationQuery(parentId, relation) {
    const { table, foreignKey, name } = relation;

    return {
      sql: `SELECT * FROM ${table} WHERE ${foreignKey} = ?`,
      params: [parentId]
    };
  }

  // Advanced query builder with method chaining
  queryBuilder(table) {
    return new QueryBuilder(this, table);
  }

  // Promisified database methods
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async close() {
    if (this.db) {
      return new Promise((resolve) => {
        this.db.close((err) => {
          if (err) {
            logger.error('Error closing database', { error: err });
          } else {
            logger.info('Database connection closed');
          }
          this.isInitialized = false;
          resolve();
        });
      });
    }
  }
}

// Modern query builder with method chaining
class QueryBuilder {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.selects = ['*'];
    this.wheres = [];
    this.orders = [];
    this.limits = null;
    this.offsets = null;
    this.joins = [];
    this.groups = [];
  }

  select(columns) {
    this.selects = Array.isArray(columns) ? columns : [columns];
    return this;
  }

  where(column, operator, value) {
    if (arguments.length === 2) {
      this.wheres.push({ column, operator: '=', value: operator });
    } else {
      this.wheres.push({ column, operator, value });
    }
    return this;
  }

  orderBy(column, direction = 'ASC') {
    this.orders.push({ column, direction: direction.toUpperCase() });
    return this;
  }

  limit(count) {
    this.limits = count;
    return this;
  }

  offset(count) {
    this.offsets = count;
    return this;
  }

  join(table, first, operator, second) {
    this.joins.push({ type: 'INNER', table, first, operator, second });
    return this;
  }

  leftJoin(table, first, operator, second) {
    this.joins.push({ type: 'LEFT', table, first, operator, second });
    return this;
  }

  groupBy(column) {
    this.groups.push(column);
    return this;
  }

  async execute() {
    let sql = `SELECT ${this.selects.join(', ')} FROM ${this.table}`;

    // Add joins
    this.joins.forEach(join => {
      const joinType = join.type;
      sql += ` ${joinType} JOIN ${join.table} ON ${join.first} ${join.operator} ${join.second}`;
    });

    // Add where conditions
    if (this.wheres.length > 0) {
      const whereConditions = this.wheres.map(w => `${w.column} ${w.operator} ?`).join(' AND ');
      sql += ` WHERE ${whereConditions}`;
    }

    // Add group by
    if (this.groups.length > 0) {
      sql += ` GROUP BY ${this.groups.join(', ')}`;
    }

    // Add order by
    if (this.orders.length > 0) {
      const orderConditions = this.orders.map(o => `${o.column} ${o.direction}`).join(', ');
      sql += ` ORDER BY ${orderConditions}`;
    }

    // Add limit and offset
    if (this.limits) {
      sql += ` LIMIT ${this.limits}`;
    }
    if (this.offsets) {
      sql += ` OFFSET ${this.offsets}`;
    }

    const params = this.wheres.map(w => w.value);

    return await this.db.executeQuery(sql, params);
  }
}

const databaseManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  databaseManager
};
