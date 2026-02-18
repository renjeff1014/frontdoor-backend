// In-memory verification code store. Key: `${pingeeId}:${normalizedContact}`. Value: { code, expiresAt }.
const store = new Map()
const TTL_MS = 10 * 60 * 1000 // 10 minutes

function key(pingeeId, contact) {
  const n = String(contact || '').trim().toLowerCase()
  return `${String(pingeeId || '').trim().toLowerCase()}:${n}`
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function setCode(pingeeId, contact) {
  const k = key(pingeeId, contact)
  const code = generateCode()
  store.set(k, { code, expiresAt: Date.now() + TTL_MS })
  return code
}

function getAndConsumeCode(pingeeId, contact, submittedCode) {
  const k = key(pingeeId, contact)
  const entry = store.get(k)
  if (!entry) return false
  if (Date.now() > entry.expiresAt) {
    store.delete(k)
    return false
  }
  if (entry.code !== String(submittedCode || '').trim()) return false
  store.delete(k)
  return true
}

module.exports = { setCode, getAndConsumeCode }
