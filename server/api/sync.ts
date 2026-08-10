import { query } from '../utils/db'

// XML에서 태그 내부 값 추출하는 간단한 헬퍼 함수
function getXmlValue(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, 's'))
  if (!match) return ''
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 네이버 카페 RSS 피드 (차단 없이 public 데이터 수집 가능)
    const rssUrl = `https://cafe.rss.naver.com/28565043.xml`

    const xmlText = await $fetch<string>(rssUrl, {
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })

    // RSS item 태그 단위 분리
    const items = xmlText.split('<item>').slice(1)
    const articles: Array<{ articleId: string; title: string; writer: string; createdAt: Date }> = []

    for (const itemXml of items) {
      const link = getXmlValue(itemXml, 'link')
      const title = getXmlValue(itemXml, 'title')
      const writer = getXmlValue(itemXml, 'author') || getXmlValue(itemXml, 'dc:creator') || '카페회원'
      const pubDateStr = getXmlValue(itemXml, 'pubDate')

      // URL에서 articleId 추출 (예: /28565043/12345)
      const idMatch = link.match(/\/(\d+)$/)
      const articleId = idMatch ? idMatch[1] : null

      if (articleId && title) {
        articles.push({
          articleId,
          title,
          writer,
          createdAt: pubDateStr ? new Date(pubDateStr) : new Date()
        })
      }
    }

    if (articles.length === 0) {
      return { success: false, message: 'RSS 피드에서 게시글을 읽어오지 못했습니다.' }
    }

    // DB 저장 (Upsert)
    for (const item of articles) {
      await query(
        `INSERT INTO articles (article_id, title, writer_nickname, comment_count, created_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (article_id) DO UPDATE 
         SET title = EXCLUDED.title`,
        [item.articleId, item.title, item.writer, 0, item.createdAt]
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