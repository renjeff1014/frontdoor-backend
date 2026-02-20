require('dotenv').config()
const express = require('express')
const cors = require('cors')

const { checkConnection } = require('./db')
const authRoutes = require('./routes/auth')
const usersRoutes = require('./routes/users')
const pingerRoutes = require('./routes/pinger')
const requestsRoutes = require('./routes/requests')
const contactsRoutes = require('./routes/contacts')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/pinger', pingerRoutes)
app.use('/requests', requestsRoutes)
app.use('/contacts', contactsRoutes)

app.get('/health', (req, res) => {
  res.json({ ok: true })
})

checkConnection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message)
    console.error('Start PostgreSQL (e.g. run: docker compose up -d db)')
    process.exit(1)
  })
