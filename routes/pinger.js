const express = require('express')
const { getUserByLinkSlug, getUserIdAndVerifiedByLinkSlug } = require('../store/users')
const { setCode, getAndConsumeCode } = require('../store/verification')
const { createRequest } = require('../store/requests')
const { sendVerificationCode } = require('../lib/mail')

const router = express.Router()

// GET /pinger/get/:pinger-id — public: get pingee by link_slug for pinger page
router.get('/get/:pingerId', async (req, res) => {
  try {
    const { pingerId } = req.params
    const pingee = await getUserByLinkSlug(pingerId)
    if (!pingee) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.status(200).json(pingee)
  } catch (err) {
    console.error('Pinger get error:', err)
    res.status(500).json({ error: 'Failed to load.' })
  }
})

// GET /pinger/require-verification?pingeeId=xxx&contact=yyy — when verified_only, send 6-digit code
router.get('/require-verification', async (req, res) => {
  try {
    const pingeeId = req.query.pingeeId
    const contact = req.query.contact
    if (!pingeeId || !contact) {
      return res.status(400).json({ error: 'pingeeId and contact are required.' })
    }
    const user = await getUserIdAndVerifiedByLinkSlug(pingeeId)
    if (!user) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (!user.verified_only) {
      return res.status(400).json({ error: 'Verification not required for this user.' })
    }
    const code = setCode(pingeeId, contact)
    const contactTrimmed = String(contact).trim()
    const isEmail = contactTrimmed.includes('@')
    if (isEmail) {
      try {
        await sendVerificationCode(contactTrimmed, code)
      } catch (err) {
        console.error('Send verification email failed:', err.message)
        console.log(`[pinger] Verification code for ${contactTrimmed}: ${code}`)
      }
    } else {
      console.log(`[pinger] Verification code for ${contactTrimmed} (phone): ${code}`)
    }
    res.status(200).json({ requireVerification: true, contact: contactTrimmed })
  } catch (err) {
    console.error('Require verification error:', err)
    res.status(500).json({ error: 'Failed to send code.' })
  }
})

// POST /pinger/request/:pingeeId?code=123456 — submit request (optional code when verified_only)
router.post('/request/:pingeeId', async (req, res) => {
  try {
    const { pingeeId } = req.params
    const code = req.query.code
    const { purpose, message, contact } = req.body || {}
    const user = await getUserIdAndVerifiedByLinkSlug(pingeeId)
    if (!user) {
      return res.status(404).json({ error: 'Not found' })
    }
    if (!purpose || !message) {
      return res.status(400).json({ error: 'purpose and message are required.' })
    }
    const fromContact = user.verified_only
      ? String(contact || '').trim()
      : (String(contact || '').trim() || 'anonymous')
    if (user.verified_only && !fromContact) {
      return res.status(400).json({ error: 'contact is required when verification is required.' })
    }
    if (user.verified_only) {
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required.' })
      }
      const valid = getAndConsumeCode(pingeeId, contact, code)
      if (!valid) {
        return res.status(400).json({ error: 'Invalid or expired code.' })
      }
      await createRequest(user.userId, fromContact, purpose, message, true)
      return res.status(200).json({ success: true })
    }
    // verified_only false: no code
    await createRequest(user.userId, fromContact, purpose, message, false)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Pinger request error:', err)
    res.status(500).json({ error: 'Failed to submit request.' })
  }
})

module.exports = router
