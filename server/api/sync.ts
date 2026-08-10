import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 최신 네이버 모바일 카페 API 엔드포인트
    const targetUrl = `https://m.cafe.naver.com/api/cafes/${CAFE_ID}/articles?page=1&perPage=50`

    const response = await $fetch<any>(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${CAFE_ID}/articles`
      }
    })

    // 응답 데이터 구조 추출
    const articleList = response?.message?.result?.articleList || response?.result?.articleList || []
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    for (const item of articleList) {
      const articleId = item.articleId || item.articleIdStr
      const title = item.subject || item.title
      const writer = item.writerNickname || item.nick

      if (articleId && title && writer) {
        articles.push({
          articleId: String(articleId),
          title: title,
          writer: writer,
          commentCount: item.commentCount || 0,
          createdAt: new Date(item.writeDateTimestamp || Date.now())
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: '게시글 데이터를 가져오지 못했습니다. 카페 가입 필요 여부나 ID를 확인하세요.' }
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

    // 기간 지난 데이터 삭제
    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, syncedCount: articles.length }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})