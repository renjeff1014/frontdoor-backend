// In-memory store. Replace with a database (e.g. PostgreSQL, MongoDB) in production.

const users = new Map()
const resetTokens = new Map()
let nextId = 1

function getUserByEmail(email) {
  const normalized = String(email).toLowerCase().trim()
  return Array.from(users.values()).find((u) => u.email === normalized)
}

function getOrCreateUser(email, passwordHash) {
  const normalized = String(email).toLowerCase().trim()
  let user = getUserByEmail(normalized)
  if (user) return user
  const id = String(nextId++)
  user = { id, email: normalized, passwordHash }
  users.set(id, user)
  return user
}

function updatePassword(email, passwordHash) {
  const normalized = String(email).toLowerCase().trim()
  const user = getUserByEmail(normalized)
  if (user) {
    user.passwordHash = passwordHash
  }
}

function saveResetToken(email, token) {
  const normalized = String(email).toLowerCase().trim()
  resetTokens.set(token, { email: normalized, expires: Date.now() + 60 * 60 * 1000 })
}

function getResetToken(token) {
  const entry = resetTokens.get(token)
  if (!entry || entry.expires < Date.now()) return null
  return entry.email
}

module.exports = {
  getUserByEmail,
  getOrCreateUser,
  updatePassword,
  saveResetToken,
  getResetToken,
}
