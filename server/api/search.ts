import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const keyword = (queryParams.q as string || '').trim()

  if (!keyword) {
    return { articles: [] }
  }

  try {
    // 닉네임 또는 제목에 키워드가 포함된 게시글 검색 (% 키워드 %)
    const result = await query(
      `SELECT article_id, title, writer_nickname, comment_count, created_at 
       FROM articles 
       WHERE writer_nickname ILIKE $1 OR title ILIKE $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [`%${keyword}%`]
    )

    return {
      articles: result.rows
    }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})