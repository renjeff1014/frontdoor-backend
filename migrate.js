require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('./db')

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf8')
    console.log(`Running ${file}...`)
    await pool.query(sql)
    console.log(`  Done.`)
  }

  await pool.end()
  console.log('Migrations complete.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
