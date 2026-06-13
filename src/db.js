const mysql = require('mysql2/promise');
const { db } = require('./config');

let pool;

async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    multipleStatements: true
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${db.database}\`
     CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );

  await connection.end();
}

async function initDb() {
  await ensureDatabase();

  pool = mysql.createPool(db);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      login VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_pair (sender_id, receiver_id, created_at),
      CONSTRAINT fk_messages_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
        ON DELETE CASCADE,
      CONSTRAINT fk_messages_receiver
        FOREIGN KEY (receiver_id) REFERENCES users(id)
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool is not initialized');
  }

  return pool;
}

module.exports = {
  initDb,
  getPool
};
