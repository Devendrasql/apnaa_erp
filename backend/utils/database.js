// backend/src/utils/database.js
const mysql = require('mysql2/promise');
const logger = require('./logger');

let pool; // Promise pool (NOT a single connection)

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Dev!@#123',
  database: process.env.DB_NAME || 'pharmacy_erp',
  charset: 'utf8mb4',
  // mysql2 pool options
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // timeouts
  acquireTimeout: 60000,
  // NOTE: `timeout` and `reconnect` are not pool options in mysql2; removing them avoids confusion
  // timezone is supported by mysql2 for date conversion on text protocol
  timezone: '+00:00',
};

/**
 * Initialize a pooled connection to the DB and test it.
 * Keep the same function name so the rest of your app doesn’t need to change.
 */
const connectDatabase = async () => {
  try {
    pool = mysql.createPool(dbConfig);

    // Test the pool with a simple query
    const [rows] = await pool.query('SELECT 1 AS ok');
    if (!rows || rows.length === 0) {
      throw new Error('Database test query returned no rows');
    }

    logger.info('Database pool created and connected successfully');
    return pool;
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};

/**
 * Get a dedicated connection from the pool.
 * IMPORTANT: This returns a PoolConnection which HAS .release()
 */
const getConnection = async () => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return pool.getConnection();
};

/**
 * Execute a single query using the shared pool (no manual connection handling).
 */
const executeQuery = async (query, params = []) => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    logger.error('Query execution failed:', { query, params, error: error.message });
    throw error;
  }
};

/**
 * Execute multiple queries in a single transaction.
 * Each item in `queries` is: { query: string, params?: any[] }
 */
const executeTransaction = async (queries) => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }

  let conn;
  try {
    conn = await pool.getConnection();     // PoolConnection (has .release)
    await conn.beginTransaction();

    const results = [];
    for (const { query, params = [] } of queries) {
      const [rows] = await conn.execute(query, params);
      results.push(rows);
    }

    await conn.commit();
    return results;
  } catch (error) {
    if (conn) {
      try { await conn.rollback(); } catch (rbErr) { logger.error('Rollback failed:', rbErr); }
    }
    logger.error('Transaction failed:', error);
    throw error;
  } finally {
    if (conn) {
      try { conn.release(); } catch (relErr) { logger.error('Connection release failed:', relErr); }
    }
  }
};

/**
 * Optional: gracefully close the pool (e.g., on process exit).
 */
const closeDatabase = async () => {
  if (pool) {
    try {
      await pool.end();
      logger.info('Database pool closed');
    } catch (error) {
      logger.error('Error closing database pool:', error);
    } finally {
      pool = null;
    }
  }
};

module.exports = {
  connectDatabase,
  getConnection,
  executeQuery,
  executeTransaction,
  closeDatabase, // optional
};





// const mysql = require('mysql2/promise');
// const logger = require('./logger');

// let connection;

// const dbConfig = {
//   host: process.env.DB_HOST || 'localhost',
//   port: parseInt(process.env.DB_PORT) || 3306,
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || 'Dev!@#123',
//   database: process.env.DB_NAME || 'pharmacy_erp',
//   charset: 'utf8mb4',
//   timezone: '+00:00',
//   acquireTimeout: 60000,
//   timeout: 60000,
//   reconnect: true,
//   connectionLimit: 10
// };

// const connectDatabase = async () => {
//   try {
//     connection = await mysql.createConnection(dbConfig);

//     // Test the connection
//     await connection.execute('SELECT 1');
//     logger.info('Database connected successfully');

//     return connection;
//   } catch (error) {
//     logger.error('Database connection failed:', error);
//     throw error;
//   }
// };

// const getConnection = () => {
//   if (!connection) {
//     throw new Error('Database not connected. Call connectDatabase() first.');
//   }
//   return connection;
// };

// const executeQuery = async (query, params = []) => {
//   try {
//     const conn = getConnection();
//     const [rows] = await conn.execute(query, params);
//     return rows;
//   } catch (error) {
//     logger.error('Query execution failed:', { query, params, error: error.message });
//     throw error;
//   }
// };

// const executeTransaction = async (queries) => {
//   const conn = getConnection();

//   try {
//     await conn.beginTransaction();

//     const results = [];
//     for (const { query, params } of queries) {
//       const [rows] = await conn.execute(query, params);
//       results.push(rows);
//     }

//     await conn.commit();
//     return results;
//   } catch (error) {
//     await conn.rollback();
//     logger.error('Transaction failed:', error);
//     throw error;
//   }
// };

// module.exports = {
//   connectDatabase,
//   getConnection,
//   executeQuery,
//   executeTransaction
// };
