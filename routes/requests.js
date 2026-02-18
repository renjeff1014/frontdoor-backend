const express = require('express')
const jwt = require('jsonwebtoken')
const { getRequestsForUser, listRequestsForUser, getRequestById } = require('../store/requests')
const { getUserWindows } = require('../store/users')

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
    res.json(request)
  } catch (err) {
    console.error('GET /requests/:id error:', err)
    res.status(500).json({ error: 'Failed to fetch request.' })
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
    res.json({ queueSummary, windows, requests })
  } catch (err) {
    console.error('GET /requests error:', err)
    res.status(500).json({ error: 'Failed to fetch requests.' })
  }
})

module.exports = router
