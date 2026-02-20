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
  const statusJson = JSON.stringify({ received: true })
  const { rows } = await query(
    `INSERT INTO requests ("from", "to", type, is_verified, message, status)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING id`,
    [fromVal, toUserId, typeId, Boolean(isVerified), message || null, statusJson]
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
    `SELECT r.id, r."from", r.received, r.message, r.attachment, r.is_verified, r.reply, r.status, rt.type
     FROM requests r
     JOIN request_types rt ON rt.id = r.type
     WHERE r.id = $1 AND r."to" = $2`,
    [requestId, userId]
  )
  const row = rows[0]
  if (!row) return null

  await query(
    `UPDATE requests SET status = jsonb_set(COALESCE(status, '{}'::jsonb), '{inreply}', 'true')
     WHERE id = $1 AND "to" = $2`,
    [requestId, userId]
  )

  let attachments = []
  if (row.attachment) {
    try {
      const parsed = typeof row.attachment === 'string' ? JSON.parse(row.attachment) : row.attachment
      attachments = Array.isArray(parsed) ? parsed : [{ name: String(row.attachment) }]
    } catch {
      attachments = [{ name: String(row.attachment) }]
    }
  }

  let replyList = []
  if (row.reply) {
    try {
      const parsed = typeof row.reply === 'string' ? JSON.parse(row.reply) : row.reply
      replyList = Array.isArray(parsed) ? parsed : []
    } catch {
      replyList = []
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
    reply: replyList,
  }
}

/**
 * Public fetch of request status by id (for pinger status page, no auth).
 * Returns type, received timestamp, and status flags.
 */
async function getRequestStatusPublic(requestId) {
  if (!requestId) return null
  const { rows } = await query(
    `SELECT r.id, r.received, r.status, rt.type
     FROM requests r
     JOIN request_types rt ON rt.id = r.type
     WHERE r.id = $1`,
    [requestId]
  )
  const row = rows[0]
  if (!row) return null
  const status = row.status && typeof row.status === 'object'
    ? row.status
    : typeof row.status === 'string'
      ? (() => { try { return JSON.parse(row.status) } catch { return {} } })()
      : {}
  return {
    id: row.id,
    type: row.type,
    received: row.received,
    status: {
      received: Boolean(status.received),
      inreply: Boolean(status.inreply),
      replied: Boolean(status.replied),
      closed: Boolean(status.closed),
    },
  }
}

/**
 * Append a reply to the request and set status.replied = true.
 */
async function addReplyToRequest(userId, requestId, replyText) {
  const text = String(replyText || '').trim()
  if (!text) throw new Error('Reply text is required')
  const { rowCount } = await query(
    `UPDATE requests
     SET reply = COALESCE(reply, '[]'::jsonb) || jsonb_build_array($2::text),
         status = jsonb_set(COALESCE(status, '{}'::jsonb), '{replied}', 'true')
     WHERE id = $1 AND "to" = $3`,
    [requestId, text, userId]
  )
  return rowCount > 0
}

/**
 * Set request status.closed = true.
 */
async function setRequestClosed(userId, requestId) {
  const { rowCount } = await query(
    `UPDATE requests
     SET status = jsonb_set(COALESCE(status, '{}'::jsonb), '{closed}', 'true')
     WHERE id = $1 AND "to" = $2`,
    [requestId, userId]
  )
  return rowCount > 0
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
  getRequestStatusPublic,
  getRequestsForUser,
  listRequestsForUser,
  getRequestById,
  addReplyToRequest,
  setRequestClosed,
}
