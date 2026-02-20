const express = require('express')
const jwt = require('jsonwebtoken')
const { listByOwner, create, getById, update, remove } = require('../store/contacts')

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

// GET /contacts — list contacts for the current user
router.get('/', requireAuth, async (req, res) => {
  try {
    const contacts = await listByOwner(req.userId)
    res.json(contacts)
  } catch (err) {
    console.error('Contacts list error:', err)
    res.status(500).json({ error: 'Failed to load contacts.' })
  }
})

// POST /contacts — create a contact
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body || {}
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' })
    }
    const contact = await create(req.userId, {
      name: name.trim(),
      email: email != null ? String(email).trim() : undefined,
      phone: phone != null ? String(phone).trim() : undefined,
    })
    res.status(201).json(contact)
  } catch (err) {
    console.error('Contact create error:', err)
    res.status(500).json({ error: 'Failed to create contact.' })
  }
})

// GET /contacts/:id — get one contact (must belong to current user)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const contact = await getById(req.userId, req.params.id)
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' })
    }
    res.json(contact)
  } catch (err) {
    console.error('Contact get error:', err)
    res.status(500).json({ error: 'Failed to load contact.' })
  }
})

// PATCH /contacts/:id — update a contact
router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body || {}
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ error: 'Name must be a non-empty string.' })
    }
    const contact = await update(req.userId, req.params.id, {
      name: name != null ? name.trim() : undefined,
      email: email != null ? String(email).trim() : undefined,
      phone: phone != null ? String(phone).trim() : undefined,
    })
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found.' })
    }
    res.json(contact)
  } catch (err) {
    console.error('Contact update error:', err)
    res.status(500).json({ error: 'Failed to update contact.' })
  }
})

// DELETE /contacts/:id — delete a contact
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await remove(req.userId, req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Contact not found.' })
    }
    res.status(204).send()
  } catch (err) {
    console.error('Contact delete error:', err)
    res.status(500).json({ error: 'Failed to delete contact.' })
  }
})

module.exports = router
