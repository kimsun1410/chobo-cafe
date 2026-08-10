import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 네이버 모바일 카페 API Target URL
    const targetUrl = `https://m.cafe.naver.com/ArticleListJson.nhn?search.clubid=${CAFE_ID}&search.page=1&search.perPage=50`
    
    // Vercel 해외 IP 차단 우회를 위한 AllOrigins 프록시 URL
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`

    const proxyResponse = await $fetch<any>(proxyUrl, {
      timeout: 10000
    })

    if (!proxyResponse || !proxyResponse.contents) {
      throw new Error('프록시 서버로부터 응답을 받지 못했습니다.')
    }

    // JSON 데이터 파싱
    const rawData = typeof proxyResponse.contents === 'string' 
      ? JSON.parse(proxyResponse.contents) 
      : proxyResponse.contents

    const articleList = rawData?.message?.result?.articleList || rawData?.result?.articleList || []
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    for (const item of articleList) {
      const articleId = item.articleId || item.articleid
      const title = item.subject || item.title
      const writer = item.writerNickname || item.nick || '익명'

      if (articleId && title) {
        articles.push({
          articleId: String(articleId),
          title,
          writer,
          commentCount: Number(item.commentCount || 0),
          createdAt: new Date(item.writeDateTimestamp || Date.now())
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: '게시글 데이터를 읽어오지 못했습니다.' }
    }

    // DB 저장 (Upsert)
    for (const item of articles) {
      await query(
        `INSERT INTO articles (article_id, title, writer_nickname, comment_count, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (article_id) DO UPDATE 
         SET title = EXCLUDED.title, comment_count = EXCLUDED.comment_count`,
        [item.articleId, item.title, item.writer, item.commentCount, item.createdAt]
      )
    }

    // 오래된 데이터 삭제
    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, count: articles.length }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Sync Failed: ${error.message}`
    })
  }
})