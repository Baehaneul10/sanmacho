import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import mysql from 'mysql2/promise'
import type { ResultSetHeader } from 'mysql2'
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

let pool: mysql.Pool | null = null

async function getPool(): Promise<mysql.Pool> {
  if (pool) return pool
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'portfolio',
    waitForConnections: true,
    connectionLimit: 10,
  })
  return pool
}

async function ensureSchema(p: mysql.Pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS board_posts (
      id VARCHAR(36) PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      author VARCHAR(40) NOT NULL,
      body TEXT NOT NULL,
      created_at BIGINT NOT NULL,
      KEY idx_board_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await p.query(`
    CREATE TABLE IF NOT EXISTS expense_settings (
      id TINYINT UNSIGNED PRIMARY KEY,
      monthly_budget INT UNSIGNED NOT NULL DEFAULT 800000
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await p.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id VARCHAR(36) PRIMARY KEY,
      amount INT UNSIGNED NOT NULL,
      category_id VARCHAR(24) NOT NULL,
      label VARCHAR(200) NOT NULL,
      spent_at DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_expense_spent (spent_at),
      KEY idx_expense_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `)
  await p.query(
    `INSERT IGNORE INTO expense_settings (id, monthly_budget) VALUES (1, 800000)`,
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
    const p = await getPool()
    await ensureSchema(p)
    const [rows] = await p.query<mysql.RowDataPacket[]>(
      'SELECT id, title, author, body, created_at AS createdAt FROM board_posts ORDER BY created_at DESC',
    )
    const posts = rows.map((r) => ({
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
    const p = await getPool()
    await ensureSchema(p)
    await p.query(
      'INSERT INTO board_posts (id, title, author, body, created_at) VALUES (?, ?, ?, ?, ?)',
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
    const p = await getPool()
    await ensureSchema(p)
    const [bRows] = await p.query<mysql.RowDataPacket[]>(
      'SELECT monthly_budget AS monthlyBudget FROM expense_settings WHERE id = 1 LIMIT 1',
    )
    const monthlyBudget =
      bRows[0] && typeof bRows[0].monthlyBudget === 'number'
        ? Number(bRows[0].monthlyBudget)
        : 800_000
    const [rows] = await p.query<mysql.RowDataPacket[]>(
      `SELECT id, amount, category_id AS categoryId, label,
              DATE_FORMAT(spent_at, '%Y-%m-%d') AS spentAt
       FROM expenses
       ORDER BY spent_at DESC, id DESC`,
    )
    const expenses = rows.map((r) => ({
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
    const p = await getPool()
    await ensureSchema(p)
    await p.query(
      'INSERT INTO expenses (id, amount, category_id, label, spent_at) VALUES (?, ?, ?, ?, ?)',
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
    const p = await getPool()
    await ensureSchema(p)
    const [result] = await p.query<ResultSetHeader>('DELETE FROM expenses WHERE id = ?', [id])
    if (result.affectedRows === 0) {
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
    const p = await getPool()
    await ensureSchema(p)
    await p.query('UPDATE expense_settings SET monthly_budget = ? WHERE id = 1', [rounded])
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
