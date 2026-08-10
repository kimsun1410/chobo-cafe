import { query } from '../utils/db'

// 간단한 XML 태그 값 추출 함수
function getXmlValue(xml: string, tagName: string): string {
  const match = xml.match(new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, 's'))
  if (!match) return ''
  return match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

export default defineEventHandler(async () => {
  const CAFE_ID = process.env.NAVER_CAFE_ID || '28565043'
  const SYNC_WINDOW_DAYS = 7

  try {
    // 네이버 카페 RSS 공식 URL 구조 (rss.cafe.naver.com/{CAFE_ID}.xml)
    const rssUrl = `https://rss.cafe.naver.com/${CAFE_ID}.xml`

    const xmlText = await $fetch<string>(rssUrl, {
      responseType: 'text',
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    })

    const items = xmlText.split('<item>').slice(1)
    const articles: Array<{ articleId: string; title: string; writer: string; createdAt: Date }> = []

    for (const itemXml of items) {
      const link = getXmlValue(itemXml, 'link')
      const title = getXmlValue(itemXml, 'title')
      const writer = getXmlValue(itemXml, 'author') || getXmlValue(itemXml, 'dc:creator') || '카페회원'
      const pubDateStr = getXmlValue(itemXml, 'pubDate')

      // URL에서 articleId 추출 (예: ArticleRead.nhn?articleid=12345 또는 /12345)
      const idMatch = link.match(/(?:articleid=|\/)(\d+)/i)
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
      return { success: false, message: 'RSS 피드 데이터를 읽어올 수 없습니다.' }
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