const { query } = require('../db')

/**
 * List all contacts for a user (owner_id).
 */
async function listByOwner(ownerId) {
  const { rows } = await query(
    `SELECT id, name, email, phone, created_at
     FROM contacts
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  )
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    created_at: row.created_at,
  }))
}

/**
 * Create a contact for the given owner. Returns the created row.
 */
async function create(ownerId, { name, email, phone }) {
  const { rows } = await query(
    `INSERT INTO contacts (owner_id, name, email, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, phone, created_at`,
    [ownerId, name, (email && email.trim()) || null, (phone && phone.trim()) || null]
  )
  const row = rows[0]
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    created_at: row.created_at,
  }
}

/**
 * Get a single contact by id if it belongs to ownerId.
 */
async function getById(ownerId, id) {
  const { rows } = await query(
    `SELECT id, name, email, phone, created_at
     FROM contacts
     WHERE id = $1 AND owner_id = $2`,
    [id, ownerId]
  )
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    created_at: row.created_at,
  }
}

/**
 * Update a contact. Returns updated contact or null if not found.
 */
async function update(ownerId, id, { name, email, phone }) {
  const { rows } = await query(
    `UPDATE contacts
     SET name = $2, email = $3, phone = $4
     WHERE id = $1 AND owner_id = $5
     RETURNING id, name, email, phone, created_at`,
    [id, name, (email && String(email).trim()) || null, (phone && String(phone).trim()) || null, ownerId]
  )
  if (rows.length === 0) return null
  const row = rows[0]
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    created_at: row.created_at,
  }
}

/**
 * Delete a contact. Returns true if a row was deleted, false if not found.
 */
async function remove(ownerId, id) {
  const { rowCount } = await query(
    'DELETE FROM contacts WHERE id = $1 AND owner_id = $2',
    [id, ownerId]
  )
  return rowCount > 0
}

/**
 * Find a contact owned by ownerId whose email or phone matches the given value.
 * Returns the contact's name if found, otherwise null.
 * Used to display contact name instead of raw email/phone in requests.
 */
async function getContactNameByFrom(ownerId, fromValue) {
  const val = typeof fromValue === 'string' ? fromValue.trim() : ''
  if (!val) return null
  const { rows } = await query(
    `SELECT name FROM contacts
     WHERE owner_id = $1
       AND (
         (email IS NOT NULL AND LOWER(TRIM(email)) = LOWER($2))
         OR (phone IS NOT NULL AND TRIM(phone) = $2)
       )
     LIMIT 1`,
    [ownerId, val]
  )
  return rows[0] ? rows[0].name : null
}

module.exports = {
  listByOwner,
  create,
  getById,
  update,
  remove,
  getContactNameByFrom,
}
