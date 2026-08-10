import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 올바른 네이버 모바일 카페 게시글 목록 API URL
    const targetUrl = `https://m.cafe.naver.com/ArticleList.nhn?search.clubid=${CAFE_ID}&search.page=1&search.perPage=50`

    const response = await $fetch<any>(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${CAFE_ID}/articles`
      }
    })

    // JSON 또는 객체 응답 처리
    const rawData = typeof response === 'string' ? JSON.parse(response) : response
    const articleList = rawData?.message?.result?.articleList || rawData?.result?.articleList || rawData?.articleList || []

    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    for (const item of articleList) {
      const articleId = item.articleId || item.articleid
      const title = item.subject || item.title
      const writer = item.writerNickname || item.nick || item.nickname

      if (articleId && title) {
        articles.push({
          articleId: String(articleId),
          title: title,
          writer: writer || '익명',
          commentCount: Number(item.commentCount || item.commentcount || 0),
          createdAt: new Date(item.writeDateTimestamp || item.writetimestamp || Date.now())
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: '게시글을 가져오지 못했습니다. 네이버 카페 권한이나 ID를 확인하세요.' }
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