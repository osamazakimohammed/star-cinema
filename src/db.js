const mysql = require('mysql2/promise');

for (const name of ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
  if (!process.env[name]) throw new Error(`${name} must be configured.`);
}

const dbPort = Number(process.env.DB_PORT);
if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
  decimalNumbers: true
});

async function checkDatabase() {
  const connection = await pool.getConnection();
  try { await connection.query('SELECT 1'); }
  finally { connection.release(); }
}

module.exports = { pool, checkDatabase };
