import { query } from '../utils/db'

export default defineEventHandler(async (event) => {
  const queryParams = getQuery(event)
  const nickname = queryParams.nickname as string

  if (!nickname) return { articleCount: 0, commentCount: 0 }

  const articleRes = await query(
    `SELECT COUNT(*) FROM articles WHERE writer_nickname = $1`,
    [nickname]
  )

  const commentRes = await query(
    `SELECT COUNT(*) FROM comments WHERE writer_nickname = $1`,
    [nickname]
  )

  return {
    articleCount: parseInt(articleRes.rows[0].count, 10),
    commentCount: parseInt(commentRes.rows[0].count, 10)
  }
})