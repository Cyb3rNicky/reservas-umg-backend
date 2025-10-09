const mysql = require('mysql2/promise');

const sslEnabled = String(process.env.DB_SSL || 'false').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  ssl: sslEnabled
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    : undefined
});

module.exports = pool;
