import { query } from '../utils/db'

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 네이버 모바일 카페 JSON 데이터 엔드포인트 호출
    const targetUrl = `https://m.cafe.naver.com/ArticleListJson.nhn?search.clubid=${CAFE_ID}&search.page=1&search.perPage=50`

    const response = await $fetch<any>(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': `https://m.cafe.naver.com/ca-fe/web/cafes/${CAFE_ID}/articles`
      }
    })

    // JSON 구조에서 게시글 목록 추출
    const articleList = response?.message?.result?.articleList || []
    const articles: Array<{ articleId: string; title: string; writer: string; commentCount: number; createdAt: Date }> = []

    for (const item of articleList) {
      if (item.articleId && item.subject && item.writerNickname) {
        articles.push({
          articleId: String(item.articleId),
          title: item.subject,
          writer: item.writerNickname,
          commentCount: item.commentCount || 0,
          createdAt: new Date(item.writeDateTimestamp) // 타임스탬프 기반 정밀 변환
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: '수집된 게시글이 없습니다. 카페 공개 여부나 CAFE_ID를 확인하세요.' }
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

    // 지정 기간 경과한 데이터 삭제
    await query(`DELETE FROM articles WHERE created_at < NOW() - INTERVAL '${SYNC_WINDOW_DAYS} days'`)

    return { success: true, syncedCount: articles.length }
  } catch (error: any) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
})