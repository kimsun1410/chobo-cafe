import * as cheerio from 'cheerio'
import { query } from '../utils/db'

const CAFE_ID = '28565043' // 네이버 카페 ID 숫자 입력
const SYNC_WINDOW_DAYS = 7

export default defineEventHandler(async () => {
  try {
    const response = await $fetch<string>(`https://cafe.naver.com/ArticleList.nhn?search.clubid=${CAFE_ID}&search.boardtype=L`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    const $ = cheerio.load(response)
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    $('.article-board table tbody tr').each((_, el) => {
      const title = $(el).find('.article').text().trim()
      const writer = $(el).find('.m-tcol-c').text().trim()
      const articleHref = $(el).find('.article').attr('href') || ''
      const articleId = articleHref.match(/articleid=(\d+)/)?.[1]
      const commentCountText = $(el).find('.num').text().trim()
      const dateStr = $(el).find('.td_date').text().trim()

      if (title && writer && articleId) {
        articles.push({
          articleId,
          title,
          writer,
          commentCount: parseInt(commentCountText, 10) || 0,
          createdAt: new Date(dateStr)
        })
      }
    })

    for (const item of articles) {
      await query(
        `INSERT INTO articles (article_id, title, writer_nickname, comment_count, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (article_id) DO UPDATE 
         SET title = EXCLUDED.title, comment_count = EXCLUDED.comment_count`,
        [item.articleId, item.title, item.writer, item.commentCount, item.createdAt]
      )
    }

    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)
    await query(`DELETE FROM comments WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, syncedCount: articles.length }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})