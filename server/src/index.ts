import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import pg from 'pg'
import { randomUUID } from 'node:crypto'

dotenv.config()

const PORT = Number(process.env.PORT || 3000)
const HOST = process.env.HOST || '0.0.0.0'

const app = express()
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1))

const corsOrigin = process.env.CORS_ORIGIN?.trim()
const corsMiddleware =
  !corsOrigin || corsOrigin === '*'
    ? cors({ origin: true, credentials: true })
    : cors({
        origin: corsOrigin.split(',').map((s) => s.trim()).filter(Boolean),
        credentials: true,
      })

app.use(corsMiddleware)
app.use(express.json())

let pool: pg.Pool | null = null

function createPool(): pg.Pool {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add your Supabase Postgres connection string to server/.env')
  }
  const sslOff = process.env.DATABASE_SSL === '0' || process.env.DATABASE_SSL === 'false'
  const sslRequire =
    process.env.DATABASE_SSL === 'require' ||
    (!sslOff && (url.includes('supabase.co') || url.includes('sslmode=require')))
  return new pg.Pool({
    connectionString: url,
    max: 10,
    ssl: sslRequire ? { rejectUnauthorized: false } : undefined,
  })
}

function getPool(): pg.Pool {
  if (!pool) pool = createPool()
  return pool
}

async function ensureSchema(p: pg.Pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS board_posts (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      author VARCHAR(40) NOT NULL,
      body TEXT NOT NULL,
      created_at BIGINT NOT NULL
    )
  `)
  await p.query(
    `CREATE INDEX IF NOT EXISTS idx_board_created ON board_posts (created_at DESC)`,
  )

  await p.query(`
    CREATE TABLE IF NOT EXISTS expense_settings (
      id SMALLINT PRIMARY KEY,
      monthly_budget INTEGER NOT NULL DEFAULT 800000
    )
  `)

  await p.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(36) PRIMARY KEY,
      amount INTEGER NOT NULL CHECK (amount >= 0),
      category_id VARCHAR(24) NOT NULL,
      label VARCHAR(200) NOT NULL,
      spent_at DATE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await p.query(`CREATE INDEX IF NOT EXISTS idx_expense_spent ON expenses (spent_at DESC)`)
  await p.query(`CREATE INDEX IF NOT EXISTS idx_expense_category ON expenses (category_id)`)

  await p.query(
    `INSERT INTO expense_settings (id, monthly_budget) VALUES (1, 800000)
     ON CONFLICT (id) DO NOTHING`,
  )
}

const ALLOWED_CATEGORY = new Set([
  'food',
  'transport',
  'culture',
  'shopping',
  'sub',
  'etc',
])

app.get('/api/board/posts', async (_req, res) => {
  try {
    const p = getPool()
    await ensureSchema(p)
    const { rows } = await p.query(
      'SELECT id, title, author, body, created_at AS "createdAt" FROM board_posts ORDER BY created_at DESC',
    )
    const posts = rows.map((r: pg.QueryResultRow) => ({
      id: String(r.id),
      title: String(r.title),
      author: String(r.author),
      body: String(r.body),
      createdAt: Number(r.createdAt),
    }))
    res.json({ posts })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.post('/api/board/posts', async (req, res) => {
  const titleRaw = typeof req.body?.title === 'string' ? req.body.title : ''
  const authorRaw = typeof req.body?.author === 'string' ? req.body.author : ''
  const bodyRaw = typeof req.body?.body === 'string' ? req.body.body : ''
  if (!authorRaw.trim() || !bodyRaw.trim()) {
    res.status(400).json({ error: 'validation' })
    return
  }
  const id = randomUUID()
  const title = titleRaw.trim() || '(제목 없음)'
  const author = authorRaw.trim()
  const body = bodyRaw.trim()
  const createdAt = Date.now()
  try {
    const p = getPool()
    await ensureSchema(p)
    await p.query(
      'INSERT INTO board_posts (id, title, author, body, created_at) VALUES ($1, $2, $3, $4, $5)',
      [id, title, author, body, createdAt],
    )
    res.status(201).json({ post: { id, title, author, body, createdAt } })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.get('/api/expenses/state', async (_req, res) => {
  try {
    const p = getPool()
    await ensureSchema(p)
    const { rows: bRows } = await p.query(
      'SELECT monthly_budget AS "monthlyBudget" FROM expense_settings WHERE id = 1 LIMIT 1',
    )
    const mb0 = bRows[0] as pg.QueryResultRow | undefined
    const monthlyBudget =
      mb0 && typeof mb0.monthlyBudget === 'number' ? Number(mb0.monthlyBudget) : 800_000

    const { rows } = await p.query(
      `SELECT id, amount, category_id AS "categoryId", label,
              to_char(spent_at, 'YYYY-MM-DD') AS "spentAt"
       FROM expenses
       ORDER BY spent_at DESC, id DESC`,
    )
    const expenses = rows.map((r: pg.QueryResultRow) => ({
      id: String(r.id),
      amount: Number(r.amount),
      categoryId: String(r.categoryId),
      label: String(r.label),
      spentAt: String(r.spentAt),
    }))
    res.json({ expenses, monthlyBudget })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.post('/api/expenses', async (req, res) => {
  const amount = Number(req.body?.amount)
  const categoryId = typeof req.body?.categoryId === 'string' ? req.body.categoryId : ''
  const labelRaw = typeof req.body?.label === 'string' ? req.body.label : ''
  const spentAtRaw = typeof req.body?.spentAt === 'string' ? req.body.spentAt : ''
  if (!Number.isFinite(amount) || amount <= 0 || amount > 2_000_000_000) {
    res.status(400).json({ error: 'validation' })
    return
  }
  if (!ALLOWED_CATEGORY.has(categoryId)) {
    res.status(400).json({ error: 'invalid_category' })
    return
  }
  const spentMatch = /^(\d{4}-\d{2}-\d{2})$/.exec(spentAtRaw.trim())
  if (!spentMatch) {
    res.status(400).json({ error: 'invalid_date' })
    return
  }
  const id = randomUUID()
  const label = labelRaw.trim() || '(메모 없음)'
  const spentAt = spentMatch[1]
  try {
    const p = getPool()
    await ensureSchema(p)
    await p.query(
      'INSERT INTO expenses (id, amount, category_id, label, spent_at) VALUES ($1, $2, $3, $4, $5::date)',
      [id, Math.round(amount), categoryId, label.slice(0, 200), spentAt],
    )
    res.status(201).json({
      expense: {
        id,
        amount: Math.round(amount),
        categoryId,
        label: label.slice(0, 200),
        spentAt,
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.delete('/api/expenses/:id', async (req, res) => {
  const id = req.params.id
  if (!id || id.length > 40) {
    res.status(400).json({ error: 'validation' })
    return
  }
  try {
    const p = getPool()
    await ensureSchema(p)
    const r = await p.query('DELETE FROM expenses WHERE id = $1', [id])
    if (!r.rowCount) {
      res.status(404).json({ error: 'not_found' })
      return
    }
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.patch('/api/expenses/budget', async (req, res) => {
  const mb = Number(req.body?.monthlyBudget)
  if (!Number.isFinite(mb) || mb < 10_000 || mb > 2_000_000_000) {
    res.status(400).json({ error: 'validation' })
    return
  }
  const rounded = Math.round(mb)
  try {
    const p = getPool()
    await ensureSchema(p)
    await p.query('UPDATE expense_settings SET monthly_budget = $1 WHERE id = 1', [rounded])
    res.json({ monthlyBudget: rounded })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'db_error' })
  }
})

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`)
})
