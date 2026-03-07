// Database Configuration
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'college_results',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 100, // For 5000+ concurrent users
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test connection on startup
pool.getConnection()
  .then(connection => {
    console.log(' Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error(' Database connection failed:', err);
    process.exit(1);
  });

module.exports = pool;