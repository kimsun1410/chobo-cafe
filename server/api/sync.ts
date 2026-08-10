import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 1. 빠른 우회 프록시(corsproxy.io)를 사용해 네이버 모바일 카페 JSON 요청
    const targetUrl = `https://m.cafe.naver.com/ArticleListJson.nhn?search.clubid=${CAFE_ID}&search.page=1&search.perPage=50`
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`

    const response = await $fetch<any>(proxyUrl, {
      timeout: 5000, // 5초 타임아웃
      headers: {
        'Accept': 'application/json'
      }
    })

    const rawData = typeof response === 'string' ? JSON.parse(response) : response
    const articleList = rawData?.message?.result?.articleList || rawData?.result?.articleList || []
    
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    for (const item of articleList) {
      const articleId = item.articleId || item.articleid
      const title = item.subject || item.title
      const writer = item.writerNickname || item.nick || '익명'

      if (articleId && title) {
        articles.push({
          articleId: String(articleId),
          title: title,
          writer: writer,
          commentCount: Number(item.commentCount || 0),
          createdAt: new Date(item.writeDateTimestamp || Date.now())
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: '파싱할 게시글이 없습니다.' }
    }

    // 2. DB 저장 (Upsert)
    for (const item of articles) {
      await query(
        `INSERT INTO articles (article_id, title, writer_nickname, comment_count, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (article_id) DO UPDATE 
         SET title = EXCLUDED.title, comment_count = EXCLUDED.comment_count`,
        [item.articleId, item.title, item.writer, item.commentCount, item.createdAt]
      )
    }

    // 3. 동기화 기간 지난 오래된 데이터 삭제
    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, count: articles.length }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Sync Error: ${error.message}`
    })
  }
})