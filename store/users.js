const { query } = require('../db')

function normalizeEmail(email) {
  return String(email).toLowerCase().trim()
}

function rowToUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
  }
}

async function getUserByEmail(email) {
  const normalized = normalizeEmail(email)
  const { rows } = await query(
    'SELECT id, email, password_hash FROM users WHERE LOWER(TRIM(email)) = $1',
    [normalized]
  )
  return rowToUser(rows[0])
}

async function getOrCreateUser(email, passwordHash) {
  const normalized = normalizeEmail(email)
  const existing = await getUserByEmail(normalized)
  if (existing) return existing
  const { rows } = await query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, password_hash',
    [normalized, passwordHash]
  )
  return rowToUser(rows[0])
}

async function updatePassword(email, passwordHash) {
  const normalized = normalizeEmail(email)
  await query(
    'UPDATE users SET password_hash = $2 WHERE LOWER(TRIM(email)) = $1',
    [normalized, passwordHash]
  )
}

async function saveResetToken(email, token) {
  const normalized = normalizeEmail(email)
  const user = await getUserByEmail(normalized)
  if (!user) return
  await query(
    "INSERT INTO tokens (user_id, token, expires_at) VALUES ($1, $2, now() + interval '1 hour')",
    [user.id, token]
  )
}

async function getResetToken(token) {
  const { rows } = await query(
    `SELECT u.email FROM tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token = $1 AND t.expires_at > now()`,
    [token]
  )
  return rows[0] ? rows[0].email : null
}

async function deleteResetToken(token) {
  await query('DELETE FROM tokens WHERE token = $1', [token])
}

async function getUserProfile(userId) {
  const { rows } = await query(
    `SELECT link_slug, display_name, timezone, windows, verified_only, verify_method, rate_limit
     FROM users WHERE id = $1`,
    [userId]
  )
  const row = rows[0]
  if (!row) return null
  const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const windows = []
  for (const day of DAY_KEYS) {
    const slots = row.windows?.[day] || []
    for (const slot of slots) {
      if (slot?.start != null && slot?.end != null) {
        windows.push({ day, start: slot.start, end: slot.end })
      }
    }
  }
  const rateLimit = row.rate_limit && typeof row.rate_limit === 'object' ? row.rate_limit : {}
  return {
    linkSlug: row.link_slug || null,
    displayName: row.display_name || null,
    timezone: row.timezone || null,
    windows,
    verifiedOnly: Boolean(row.verified_only),
    verifyMethod: row.verify_method || null,
    rateLimit,
  }
}

async function updateUserProfile(userId, { linkSlug, displayName, timezone }) {
  await query(
    `UPDATE users
     SET link_slug = COALESCE($2, link_slug),
         display_name = COALESCE($3, display_name),
         timezone = COALESCE($4, timezone)
     WHERE id = $1`,
    [userId, linkSlug ?? null, displayName ?? null, timezone ?? null]
  )
}

// Convert API format [{ day, start, end }, ...] to DB format { Sun: [], Mon: [{ start, end }], ... }
const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
function windowsArrayToDb(windows) {
  const db = {}
  for (const day of DAY_KEYS) {
    db[day] = []
  }
  for (const w of windows || []) {
    const day = w?.day
    if (!day || !DAY_KEYS.includes(day)) continue
    const start = w?.start ?? null
    const end = w?.end ?? null
    if (start != null && end != null) {
      db[day].push({ start, end })
    }
  }
  return db
}

async function updateUserReplyWindows(userId, windows) {
  const windowsJson = JSON.stringify(windowsArrayToDb(windows))
  await query(
    'UPDATE users SET windows = $2::jsonb WHERE id = $1',
    [userId, windowsJson]
  )
}

// verifiedOnly: boolean from client, stored as verified_only in DB
async function getUserByLinkSlug(linkSlug) {
  if (!linkSlug || typeof linkSlug !== 'string') return null
  const slug = String(linkSlug).trim().toLowerCase()
  if (!slug) return null
  const { rows } = await query(
    'SELECT display_name, verified_only, verify_method FROM users WHERE LOWER(TRIM(link_slug)) = $1',
    [slug]
  )
  const row = rows[0]
  if (!row) return null
  const name =
    row.display_name && row.display_name.trim()
      ? row.display_name.trim()
      : slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    name,
    verified_only: Boolean(row.verified_only),
    verify_method: row.verify_method || 'Phone or email',
  }
}

async function getUserWindows(userId) {
  const { rows } = await query(
    'SELECT windows, timezone FROM users WHERE id = $1',
    [userId]
  )
  const row = rows[0]
  if (!row || !row.windows) return []
  const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const out = []
  for (const day of DAY_KEYS) {
    const slots = row.windows[day] || []
    for (const slot of slots) {
      if (slot && slot.start != null && slot.end != null) {
        out.push({ day, start: slot.start, end: slot.end })
      }
    }
  }
  return out
}

async function getUserIdAndVerifiedByLinkSlug(linkSlug) {
  if (!linkSlug || typeof linkSlug !== 'string') return null
  const slug = String(linkSlug).trim().toLowerCase()
  if (!slug) return null
  const { rows } = await query(
    'SELECT id, verified_only FROM users WHERE LOWER(TRIM(link_slug)) = $1',
    [slug]
  )
  const row = rows[0]
  if (!row) return null
  return {
    userId: row.id,
    verified_only: Boolean(row.verified_only),
  }
}

async function updateUserTrustSettings(userId, { verifiedOnly, verifyMethod, rateLimit }) {
  const verifiedOnlyVal =
    verifiedOnly === true ? true : verifiedOnly === false ? false : null
  const verifyMethodVal = verifyMethod != null ? String(verifyMethod) : null
  const rateLimitJson =
    rateLimit != null && typeof rateLimit === 'object'
      ? JSON.stringify(rateLimit)
      : null
  await query(
    `UPDATE users
     SET verified_only = COALESCE($2, verified_only),
         verify_method = COALESCE($3, verify_method),
         rate_limit = COALESCE(CAST($4 AS jsonb), rate_limit)
     WHERE id = $1`,
    [userId, verifiedOnlyVal, verifyMethodVal, rateLimitJson]
  )
}

module.exports = {
  getUserByEmail,
  getOrCreateUser,
  getUserByLinkSlug,
  getUserWindows,
  getUserProfile,
  getUserIdAndVerifiedByLinkSlug,
  updatePassword,
  saveResetToken,
  getResetToken,
  deleteResetToken,
  updateUserProfile,
  updateUserReplyWindows,
  updateUserTrustSettings,
}
