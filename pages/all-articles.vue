<template>
  <div class="site-container">
    <header class="header">
      <h1 class="title"><NuxtLink to="/">해초 카페 게시글 작성 개수 확인</NuxtLink></h1>
      <p class="description">
        수집된 글·댓글 수를 보조로 확인하는 비공식 도구입니다.<br />
        오차가 있을 수 있으니 정확한 정보는 카페에서 확인해 주세요.
      </p>
    </header>

    <main class="main-content">
      <section class="banner-notice">
        <p><strong>임시 메뉴</strong>입니다. 현재 수집 구간(<code>SYNC_WINDOW</code>)에 해당하는 저장 글만 표시합니다.</p>
      </section>

      <section class="summary-section">
        <div class="summary-row">
          <span>이 구간 전체 글</span>
          <strong class="total-count">{{ articles?.length || 0 }}개</strong>
        </div>
        <div class="summary-meta">
          <p>오늘 날짜: {{ todayStr }}</p>
          <p>조회 기간: {{ startDateStr }}~{{ todayStr }} <span>(7일간)</span></p>
        </div>
      </section>

      <section class="article-list-section">
        <h2 class="list-title">저장된 글 전체</h2>
        <ul class="article-list">
          <li v-for="item in articles" :key="item.id" class="article-item">
            <div class="article-title">{{ item.title }}</div>
            <div class="article-meta">
              <span>작성자: {{ item.writer_nickname }}</span>
              <span class="divider">|</span>
              <span>작성일: {{ new Date(item.created_at).toLocaleDateString() }}</span>
            </div>
          </li>
        </ul>
      </section>
    </main>

    <footer class="footer">
      <p>오늘 방문자 <strong>—</strong>명</p>
    </footer>
  </div>
</template>

<script setup>
const { data: articles } = await useAsyncData('all-articles', async () => {
  const { query } = await import('~/server/utils/db')
  const res = await query('SELECT * FROM articles ORDER BY created_at DESC')
  return res.rows
})

const now = new Date()
const startDate = new Date()
startDate.setDate(now.getDate() - 7)

const formatDateMonthDay = (date) => `${date.getMonth() + 1}월 ${date.getDate()}일`
const todayStr = formatDateMonthDay(now)
const startDateStr = formatDateMonthDay(startDate)
</script>

<style scoped>
.site-container { max-width: var(--max-width); margin: 0 auto; padding: 40px 20px; }
.header { text-align: center; margin-bottom: 24px; }
.title { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
.description { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }
.banner-notice { background-color: var(--bg-warning); border: 1px solid #ffeeba; border-radius: 6px; padding: 12px 16px; font-size: 0.875rem; margin-bottom: 16px; }
.summary-section { border: 1px solid var(--border-color); border-radius: 6px; padding: 16px; margin-bottom: 24px; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border-color); margin-bottom: 12px; }
.total-count { color: var(--primary-color); }
.summary-meta { font-size: 0.85rem; color: var(--text-secondary); }
.list-title { font-size: 1.125rem; font-weight: 700; margin-bottom: 12px; }
.article-list { list-style: none; }
.article-item { padding: 12px 0; border-bottom: 1px solid var(--border-color); }
.article-title { font-size: 0.95rem; font-weight: 500; margin-bottom: 4px; }
.article-meta { font-size: 0.825rem; color: var(--text-secondary); display: flex; gap: 6px; }
.divider { color: var(--border-color); }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center; font-size: 0.875rem; color: var(--text-secondary); }
</style>