import pg from 'pg'

const { Pool } = pg

// 환경변수가 없으면 에러를 명확하게 내도록 설정
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is missing!')
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') 
    ? false 
    : { rejectUnauthorized: false },
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