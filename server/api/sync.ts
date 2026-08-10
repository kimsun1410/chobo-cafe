import * as cheerio from 'cheerio'
import { query } from '../utils/db'

export default defineEventHandler(async () => {
  // 1. 카페 ID 설정 (환경변수 또는 지정 ID 사용)
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043' 
  const SYNC_WINDOW_DAYS = 7

  try {
    // 2. 네이버 모바일 카페 목록 페이지 요청 (iframe 없이 HTML에 직접 데이터 존재)
    const targetUrl = `https://m.cafe.naver.com/ArticleAllListAsync.nhn?search.clubid=${CAFE_ID}&search.page=1&search.perPage=50`

    const response = await $fetch<string>(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${CAFE_ID}/articles`
      }
    })

    const $ = cheerio.load(response)
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    // 3. 네이버 모바일 게시판 DOM 요소 파싱
    $('.article_list .item').each((_, el) => {
      const title = $(el).find('.txt').text().trim()
      const writer = $(el).find('.nick').text().trim()
      const href = $(el).find('a.link').attr('href') || ''
      const articleId = href.match(/articles\/(\d+)/)?.[1] || href.match(/articleid=(\d+)/)?.[1]
      const commentCountText = $(el).find('.cmt_num').text().trim().replace(/[^0-9]/g, '')
      const dateStr = $(el).find('.time').text().trim()

      if (title && writer && articleId) {
        articles.push({
          articleId,
          title,
          writer,
          commentCount: parseInt(commentCountText, 10) || 0,
          createdAt: parseNaverDate(dateStr)
        })
      }
    })

    if (articles.length === 0) {
      return { success: false, message: '수집된 게시글이 없습니다. CAFE_ID 또는 셀렉터를 확인하세요.' }
    }

    // 4. PostgreSQL DB 저장 (Upsert)
    for (const item of articles) {
      await query(
        `INSERT INTO articles (article_id, title, writer_nickname, comment_count, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (article_id) DO UPDATE 
         SET title = EXCLUDED.title, comment_count = EXCLUDED.comment_count`,
        [item.articleId, item.title, item.writer, item.commentCount, item.createdAt]
      )
    }

    // 5. 오래된 데이터 정리
    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, syncedCount: articles.length }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})

// 네이버 상대 시간(예: "방금 전", "10분 전", "12:30", "26.08.10.") 변환 함수
function parseNaverDate(dateStr: string): Date {
  const now = new Date()
  if (dateStr.includes('분 전')) {
    const mins = parseInt(dateStr, 10) || 0
    return new Date(now.getTime() - mins * 60 * 1000)
  }
  if (dateStr.includes(':')) {
    const [hours, mins] = dateStr.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, mins, 0, 0)
    return date
  }
  return new Date(dateStr.replace(/\./g, '-'))
}