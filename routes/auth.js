const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { getOrCreateUser, getUserByEmail, updatePassword, saveResetToken, getResetToken } = require('../store/users')

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const existing = getUserByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = getOrCreateUser(email, hashed)
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email },
    })
  } catch (err) {
    console.error('Signup error:', err)
    res.status(500).json({ error: 'Sign up failed. Please try again.' })
  }
})

// POST /auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const user = getUserByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      token,
      user: { id: user.id, email: user.email },
    })
  } catch (err) {
    console.error('Signin error:', err)
    res.status(500).json({ error: 'Sign in failed. Please try again.' })
  }
})

// POST /auth/forgot-password
router.post('/forgot-password', (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' })
    }

    const user = getUserByEmail(email)
    if (user) {
      const token = crypto.randomBytes(32).toString('hex')
      saveResetToken(email, token)
      // In production: send email with link containing token
      // e.g. https://yoursite.com/reset-password?token=...
      console.log(`[Dev] Reset token for ${email}: ${token}`)
    }

    // Always return success - don't reveal if email exists
    res.json({ message: 'If an account exists for this email, you will receive a reset link.' })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: 'Request failed. Please try again.' })
  }
})

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' })
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const email = getResetToken(token)
    if (!email) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    updatePassword(email, hashed)
    // In production: invalidate token after use

    res.json({ message: 'Password has been reset. You can sign in with your new password.' })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Reset failed. Please try again.' })
  }
})

module.exports = router
