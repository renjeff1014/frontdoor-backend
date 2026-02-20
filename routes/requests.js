const express = require('express')
const jwt = require('jsonwebtoken')
const { getRequestsForUser, listRequestsForUser, getRequestById, addReplyToRequest, setRequestClosed } = require('../store/requests')
const { getUserWindows } = require('../store/users')
const { getContactNameByFrom } = require('../store/contacts')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return res.status(401).json({ error: 'Authorization required.' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}

// GET /requests/:id — fetch a single request (must belong to current user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await getRequestById(req.userId, req.params.id)
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' })
    }
    const displayFrom = await getContactNameByFrom(req.userId, request.from)
    res.json({ ...request, from: displayFrom ?? request.from, isInContact: !!displayFrom })
  } catch (err) {
    console.error('GET /requests/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch request.' })
  }
})

// POST /requests/:id/reply — add a reply and set status.replied = true
router.post('/:id/reply', requireAuth, async (req, res) => {
  try {
    const requestId = req.params.id
    const replyText = req.body?.reply != null ? String(req.body.reply) : ''
    const ok = await addReplyToRequest(req.userId, requestId, replyText)
    if (!ok) {
      return res.status(404).json({ error: 'Request not found.' })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /requests/:id/reply error:', err)
    res.status(400).json({ error: err.message || 'Failed to add reply.' })
  }
})

// POST /requests/:id/archive — set status.closed = true
router.post('/:id/archive', requireAuth, async (req, res) => {
  try {
    const requestId = req.params.id
    const ok = await setRequestClosed(req.userId, requestId)
    if (!ok) {
      return res.status(404).json({ error: 'Request not found.' })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('POST /requests/:id/archive error:', err)
    res.status(500).json({ error: 'Failed to archive.' })
  }
})

// GET /requests — fetch queue summary and reply windows for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const [queueSummary, windows, requests] = await Promise.all([
      getRequestsForUser(req.userId),
      getUserWindows(req.userId),
      listRequestsForUser(req.userId),
    ])
    const resolvedRequests = await Promise.all(
      requests.map(async (r) => {
        const displayFrom = await getContactNameByFrom(req.userId, r.from)
        return { ...r, from: displayFrom ?? r.from, isInContact: !!displayFrom }
      })
    )
    res.json({ queueSummary, windows, requests: resolvedRequests })
  } catch (err) {
    console.error('GET /requests error:', err)
    res.status(500).json({ error: 'Failed to fetch requests.' })
  }
})

module.exports = router
