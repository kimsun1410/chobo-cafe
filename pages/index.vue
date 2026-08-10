<template>
  <div class="site-container">
    <header class="header">
      <h1 class="title"><NuxtLink to="/">해초 카페 게시글 작성 개수 확인</NuxtLink></h1>
      <p class="description">
        수집된 글·댓글 수를 보조로 확인하는 비공식 도구입니다.<br />
        오차가 있을 수 있으니 정확한 정보는 카페에서 확인해 주세요.
      </p>
      <nav class="nav">
        <NuxtLink to="/all-articles">전체 목록 (임시)</NuxtLink>
      </nav>
    </header>

    <main class="main-content">
      <section aria-label="닉네임 검색">
        <form @submit.prevent="handleSearch" class="search-form">
          <input
            v-model="nickname"
            type="text"
            placeholder="카페 닉네임을 입력하세요"
            class="search-input"
          />
          <button type="submit" :disabled="pending" class="search-button">검색</button>
        </form>

        <div v-if="searchResult !== null" class="result-card">
          <div class="result-header">
            <strong>{{ searchedNickname }}</strong> 님의 작성 개수
          </div>

          <div class="tab-list">
            <button
              type="button"
              class="tab-item"
              :class="{ active: activeTab === 'articles' }"
              @click="activeTab = 'articles'"
            >
              작성 글 <span>({{ searchResult.articleCount }})</span>
            </button>
            <button
              type="button"
              class="tab-item"
              :class="{ active: activeTab === 'comments' }"
              @click="activeTab = 'comments'"
            >
              작성 댓글 <span>({{ searchResult.commentCount }})</span>
            </button>
          </div>

          <div class="tab-panel">
            <div v-if="activeTab === 'articles'" class="count-box">
              <span class="label">수집된 작성 글</span>
              <strong class="count-value">{{ searchResult.articleCount }}개</strong>
            </div>
            <div v-if="activeTab === 'comments'" class="count-box">
              <span class="label">수집된 작성 댓글</span>
              <strong class="count-value">{{ searchResult.commentCount }}개</strong>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>오늘 방문자 <strong>{{ visitorCount }}</strong>명</p>
    </footer>
  </div>
</template>

<script setup>
const nickname = ref('')
const searchedNickname = ref('')
const searchResult = ref(null)
const activeTab = ref('articles')
const pending = ref(false)

const { data: visitorData } = await useFetch('/api/visitors')
const visitorCount = computed(() => visitorData.value?.count ?? '—')

const handleSearch = async () => {
  if (!nickname.value.trim()) return
  pending.value = true

  try {
    const data = await $fetch('/api/search', {
      params: { nickname: nickname.value }
    })
    searchedNickname.value = nickname.value
    searchResult.value = data
  } finally {
    pending.value = false
  }
}
</script>

<style scoped>
.site-container { max-width: var(--max-width); margin: 0 auto; padding: 40px 20px; min-height: 100vh; display: flex; flex-direction: column; }
.header { text-align: center; margin-bottom: 24px; }
.title { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
.description { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px; }
.nav a { font-size: 0.875rem; color: var(--primary-color); text-decoration: underline; }
.main-content { flex: 1; }
.search-form { display: flex; gap: 8px; margin-bottom: 24px; }
.search-input { flex: 1; padding: 12px 16px; border: 1px solid var(--border-color); border-radius: 6px; outline: none; }
.search-input:focus { border-color: var(--primary-color); }
.search-button { padding: 0 20px; background-color: #111111; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; }
.result-card { border: 1px solid var(--border-color); border-radius: 8px; background-color: #ffffff; overflow: hidden; }
.result-header { padding: 16px 20px; border-bottom: 1px solid var(--border-color); }
.tab-list { display: flex; background-color: var(--bg-light); border-bottom: 1px solid var(--border-color); }
.tab-item { flex: 1; padding: 12px 0; border: none; background: none; color: var(--text-secondary); cursor: pointer; text-align: center; border-bottom: 2px solid transparent; }
.tab-item.active { color: var(--primary-color); background-color: #ffffff; font-weight: 700; border-bottom-color: var(--primary-color); }
.tab-panel { padding: 24px 20px; }
.count-box { display: flex; justify-content: space-between; align-items: center; }
.count-value { font-size: 1.5rem; font-weight: 700; color: var(--primary-color); }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center; font-size: 0.875rem; color: var(--text-secondary); }
</style>