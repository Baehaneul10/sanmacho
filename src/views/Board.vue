<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBoardStore } from '../stores/board'
import './Board.css'

const board = useBoardStore()
const title = ref('')
const author = ref('')
const body = ref('')
const submitError = ref<string | null>(null)

function formatDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts))
  } catch {
    return new Date(ts).toLocaleString()
  }
}

onMounted(() => {
  void board.hydrate()
})

async function handleSubmit() {
  submitError.value = null
  if (!author.value.trim() || !body.value.trim()) return
  try {
    await board.addPost({
      title: title.value,
      author: author.value,
      body: body.value,
    })
    title.value = ''
    author.value = ''
    body.value = ''
  } catch {
    submitError.value = '등록에 실패했습니다. 잠시 후 다시 시도해 주세요.'
  }
}
</script>

<template>
  <div class="board-page">
    <header class="board-page__header">
      <h1 class="board-page__title">Board</h1>
      <p class="board-page__lead">방문 피드백이나 짧은 메모를 남길 수 있는 공간입니다.</p>
    </header>

    <p v-if="board.loadError" class="board-banner board-banner--warn">
      API에 연결할 수 없어 이 브라우저 저장소(localStorage) 목록을 표시합니다.
    </p>
    <p v-if="submitError" class="board-banner board-banner--error">{{ submitError }}</p>

    <form class="board-form" @submit.prevent="handleSubmit">
      <label class="board-form__field">
        <span>제목 (선택)</span>
        <input v-model="title" placeholder="제목을 입력하세요" maxlength="120" />
      </label>
      <label class="board-form__field">
        <span>닉네임</span>
        <input v-model="author" placeholder="표시될 이름" maxlength="40" required />
      </label>
      <label class="board-form__field">
        <span>내용</span>
        <textarea
          v-model="body"
          placeholder="피드백이나 인사를 남겨 주세요"
          rows="4"
          maxlength="2000"
          required
        />
      </label>
      <button type="submit" class="board-form__submit">등록</button>
    </form>

    <section class="board-list-section" aria-label="게시글 목록">
      <h2 class="board-list-section__heading">글 목록</h2>
      <p v-if="board.posts.length === 0" class="board-empty">아직 등록된 글이 없습니다.</p>
      <ul v-else class="board-list">
        <li v-for="p in board.posts" :key="p.id" class="board-post">
          <div class="board-post__meta">
            <strong class="board-post__title">{{ p.title }}</strong>
            <span class="board-post__by">{{ p.author }} · {{ formatDate(p.createdAt) }}</span>
          </div>
          <p class="board-post__body">{{ p.body }}</p>
        </li>
      </ul>
    </section>

    <p class="board-disclaimer">
      <template v-if="board.source === 'api'">
        글은 MariaDB에 저장되며, 같은 도메인의 <code>/api</code>(또는 <code>VITE_API_BASE</code>)로 동기화됩니다.
      </template>
      <template v-else>
        현재는 API에 연결되지 않아 이 브라우저 저장소에만 보관됩니다. 실서버에서는 nginx로
        <code>/api</code>를 Node API에 넘기고 MariaDB를 켜면 됩니다. 개발 시에는
        <code>npm run dev</code>의 Vite 프록시와 <code>server</code>를 함께 실행하세요.
      </template>
    </p>
  </div>
</template>
