import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : {
        rejectUnauthorized: false
      },
  // 경고 메시지 방지 옵션 추가
  sslmode: 'verify-full', 
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
})

export async function query(text: string, params?: any[]) {
  const client = await pool.connect()
  try {
    return await client.query(text, params)
  } finally {
    client.release()
  }
}