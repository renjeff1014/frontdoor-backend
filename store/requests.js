const { query } = require('../db')

async function getRequestTypeIdByType(typeLabel) {
  const label = String(typeLabel || '').trim()
  if (!label) return null
  const { rows } = await query(
    'SELECT id FROM request_types WHERE type = $1',
    [label]
  )
  return rows[0] ? rows[0].id : null
}

async function createRequest(toUserId, fromContact, purposeTypeLabel, message, isVerified) {
  const typeId = await getRequestTypeIdByType(purposeTypeLabel)
  if (!typeId) {
    throw new Error('Invalid request type')
  }
  const fromVal = String(fromContact || '').trim()
  if (!fromVal) {
    throw new Error('Contact is required')
  }
  const { rows } = await query(
    `INSERT INTO requests ("from", "to", type, is_verified, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [fromVal, toUserId, typeId, Boolean(isVerified), message || null]
  )
  return rows[0].id
}

const TYPE_TO_COLOR = {
  'Quick question': 'purple',
  'Need a decision': 'orange',
  'Schedule time': 'green',
  'FYI / info': 'purple',
  Emergency: 'orange',
}

async function getRequestsForUser(userId) {
  const { rows } = await query(
    `SELECT rt.type, COUNT(r.id)::int AS count
     FROM requests r
     JOIN request_types rt ON rt.id = r.type
     WHERE r."to" = $1
     GROUP BY rt.type
     ORDER BY count DESC`,
    [userId]
  )
  return rows.map((r) => ({
    type: r.type,
    count: r.count,
    color: TYPE_TO_COLOR[r.type] || 'purple',
  }))
}

async function getRequestById(userId, requestId) {
  const { rows } = await query(
    `SELECT r.id, r."from", r.received, r.message, r.attachment, r.is_verified, rt.type
     FROM requests r
     JOIN request_types rt ON rt.id = r.type
     WHERE r.id = $1 AND r."to" = $2`,
    [requestId, userId]
  )
  const row = rows[0]
  if (!row) return null
  let attachments = []
  if (row.attachment) {
    try {
      const parsed = typeof row.attachment === 'string' ? JSON.parse(row.attachment) : row.attachment
      attachments = Array.isArray(parsed) ? parsed : [{ name: String(row.attachment) }]
    } catch {
      attachments = [{ name: String(row.attachment) }]
    }
  }
  return {
    id: row.id,
    from: row.from,
    received: row.received,
    message: row.message || '',
    type: row.type,
    isVerified: Boolean(row.is_verified),
    attachment: row.attachment,
    attachments,
  }
}

async function listRequestsForUser(userId) {
  const { rows } = await query(
    `SELECT r.id, r."from", r.received, r.message, rt.type
     FROM requests r
     JOIN request_types rt ON rt.id = r.type
     WHERE r."to" = $1
     ORDER BY r.received DESC`,
    [userId]
  )
  return rows.map((r) => ({
    id: r.id,
    from: r.from,
    received: r.received,
    message: r.message || '',
    type: r.type,
  }))
}

module.exports = {
  getRequestTypeIdByType,
  createRequest,
  getRequestsForUser,
  listRequestsForUser,
  getRequestById,
}
