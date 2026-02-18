const { Pool } = require('pg')

// Prefer 127.0.0.1 over localhost to avoid IPv6 (::1) EACCES on Windows
// pg requires password to be a string (never undefined) for SCRAM auth
function getConfig() {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL.replace(/localhost/g, '127.0.0.1'))
    return {
      connectionString: url.toString(),
      password: url.password || '',
    }
  }
  return {
    host: process.env.PGHOST || '127.0.0.1',
    port: process.env.PGPORT || 5432,
    user: process.env.PGUSER,
    password: typeof process.env.PGPASSWORD === 'string' ? process.env.PGPASSWORD : '',
    database: process.env.PGDATABASE,
  }
}

const pool = new Pool(getConfig())

async function checkConnection() {
  const client = await pool.connect()
  client.release()
}

module.exports = { pool, query: (text, params) => pool.query(text, params), checkConnection }
