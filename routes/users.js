const express = require('express')
const jwt = require('jsonwebtoken')
const {
  getUserProfile,
  updateUserProfile,
  updateUserReplyWindows,
  updateUserTrustSettings,
} = require('../store/users')

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

// GET /users/profile — fetch current user's profile and settings
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const profile = await getUserProfile(req.userId)
    if (!profile) {
      return res.status(404).json({ error: 'User not found.' })
    }
    res.json(profile)
  } catch (err) {
    console.error('Profile fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch profile.' })
  }
})

// PATCH /users/profile — update current user's profile (linkSlug, displayName, timezone)
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { linkSlug, displayName, timezone } = req.body
    await updateUserProfile(req.userId, {
      linkSlug: linkSlug ?? null,
      displayName: displayName ?? null,
      timezone: timezone ?? null,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Profile update error:', err)
    res.status(500).json({ error: 'Failed to update profile.' })
  }
})

// PATCH /users/reply-windows — update current user's reply windows
router.patch('/reply-windows', requireAuth, async (req, res) => {
  try {
    const { windows } = req.body
    if (!Array.isArray(windows)) {
      return res.status(400).json({ error: 'windows must be an array.' })
    }
    await updateUserReplyWindows(req.userId, windows)
    res.json({ ok: true })
  } catch (err) {
    console.error('Reply windows update error:', err)
    res.status(500).json({ error: 'Failed to update reply windows.' })
  }
})

// PATCH /users/trust-settings — update verified_only, verify_method, rate_limit
router.patch('/trust-settings', requireAuth, async (req, res) => {
  try {
    const { verifiedOnly, verifyMethod, rateLimit } = req.body
    await updateUserTrustSettings(req.userId, {
      verifiedOnly,
      verifyMethod: verifyMethod ?? null,
      rateLimit: rateLimit ?? null,
    })
    res.json({ ok: true })
  } catch (err) {
    console.error('Trust settings update error:', err)
    res.status(500).json({ error: 'Failed to update trust settings.' })
  }
})

module.exports = router
