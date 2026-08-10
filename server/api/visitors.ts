import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const today = new Date().toISOString().split('T')[0]

  const res = await query(
    `INSERT INTO visitors (date, count) VALUES ($1, 1)
     ON CONFLICT (date) DO UPDATE SET count = visitors.count + 1
     RETURNING count`,
    [today]
  )

  return { count: res.rows[0].count }
})