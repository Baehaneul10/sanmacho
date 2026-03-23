<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import './ReactionGame.css'

type Phase = 'intro' | 'ready' | 'wait' | 'go' | 'result' | 'early'

const phase = ref<Phase>('intro')
const reactionMs = ref<number | null>(null)
const bestMs = ref<number | null>(null)
const goAt = ref(0)
let waitTimer: ReturnType<typeof setTimeout> | null = null

const STORAGE_KEY = 'reaction-game-best-ms'

function loadBest() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) bestMs.value = n
  } catch {
    /* ignore */
  }
}

function saveBest(ms: number) {
  const prev = bestMs.value
  if (prev === null || ms < prev) {
    bestMs.value = ms
    try {
      sessionStorage.setItem(STORAGE_KEY, String(ms))
    } catch {
      /* ignore */
    }
  }
}

loadBest()

const panelClass = computed(() => {
  switch (phase.value) {
    case 'go':
      return 'reaction-panel reaction-panel--go'
    case 'early':
      return 'reaction-panel reaction-panel--early'
    case 'result':
      return 'reaction-panel reaction-panel--result'
    case 'wait':
    case 'ready':
      return 'reaction-panel reaction-panel--wait'
    default:
      return 'reaction-panel reaction-panel--intro'
  }
})

const hint = computed(() => {
  switch (phase.value) {
    case 'intro':
      return '시작하면 잠시 후 화면이 초록으로 바뀝니다. 바뀌는 순간 클릭해 반응 시간을 재보세요.'
    case 'ready':
      return '곧 시작합니다. 초록 전에 누르면 실격입니다.'
    case 'wait':
      return '초록이 될 때까지 기다렸다가 클릭하세요.'
    case 'go':
      return '지금!'
    case 'result':
      return reactionMs.value !== null
        ? `이번 기록: ${Math.round(reactionMs.value)} ms · 패널을 눌러 다음 라운드`
        : ''
    case 'early':
      return '너무 빨랐어요. 패널을 눌러 다시 시도하세요.'
    default:
      return ''
  }
})

function clearWaitTimer() {
  if (waitTimer !== null) {
    clearTimeout(waitTimer)
    waitTimer = null
  }
}

function startRound() {
  clearWaitTimer()
  phase.value = 'ready'
  reactionMs.value = null
  window.setTimeout(() => {
    if (phase.value !== 'ready') return
    phase.value = 'wait'
    const delay = 1500 + Math.random() * 2500
    waitTimer = window.setTimeout(() => {
      waitTimer = null
      if (phase.value !== 'wait') return
      phase.value = 'go'
      goAt.value = performance.now()
    }, delay)
  }, 600)
}

function onPanelClick() {
  if (phase.value === 'intro') {
    startRound()
    return
  }
  if (phase.value === 'result' || phase.value === 'early') {
    startRound()
    return
  }
  if (phase.value === 'ready' || phase.value === 'wait') {
    clearWaitTimer()
    phase.value = 'early'
    return
  }
  if (phase.value === 'go') {
    const ms = performance.now() - goAt.value
    reactionMs.value = ms
    saveBest(ms)
    phase.value = 'result'
    return
  }
}

function onGlobalKeydown(e: KeyboardEvent) {
  const t = e.target
  if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return
  if (e.code !== 'Space' && e.code !== 'Enter') return
  if (phase.value === 'intro') {
    e.preventDefault()
    startRound()
    return
  }
  if (phase.value === 'result' || phase.value === 'early') {
    e.preventDefault()
    startRound()
    return
  }
  if (phase.value === 'go' || phase.value === 'wait' || phase.value === 'ready') {
    e.preventDefault()
    onPanelClick()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  clearWaitTimer()
  window.removeEventListener('keydown', onGlobalKeydown)
})
</script>

<template>
  <div class="reaction-page">
    <header class="reaction-page__header">
      <p class="reaction-page__eyebrow">Interactive · Vue 3</p>
      <h1 class="reaction-page__title">리액션 챌린지</h1>
      <p class="reaction-page__lead">
        포트폴리오용 초소형 게임입니다. 초록 신호에 맞춰 클릭하면 반응 시간이 측정됩니다.
      </p>
      <RouterLink class="reaction-page__back" :to="{ name: 'project' }">← 프로젝트 목록</RouterLink>
    </header>

    <div class="reaction-game">
      <div class="reaction-game__meta">
        <span v-if="bestMs !== null" class="reaction-game__best">세션 최고: {{ Math.round(bestMs) }} ms</span>
        <span v-else class="reaction-game__best reaction-game__best--muted">세션 최고: —</span>
      </div>

      <button
        type="button"
        :class="panelClass"
        class="reaction-panel"
        :aria-label="phase === 'intro' ? '게임 시작' : '게임 영역'"
        @click="onPanelClick"
      >
        <span class="reaction-panel__label">
          <template v-if="phase === 'intro'">시작하기</template>
          <template v-else-if="phase === 'ready'">준비…</template>
          <template v-else-if="phase === 'wait'">기다리기</template>
          <template v-else-if="phase === 'go'">클릭!</template>
          <template v-else-if="phase === 'result' && reactionMs !== null">
            {{ Math.round(reactionMs) }} ms
          </template>
          <template v-else-if="phase === 'early'">실격</template>
        </span>
        <span class="reaction-panel__hint">{{ hint }}</span>
      </button>

      <div class="reaction-game__actions">
        <button v-if="phase === 'intro'" type="button" class="reaction-btn reaction-btn--primary" @click="startRound">
          라운드 시작
        </button>
        <button
          v-else-if="phase === 'result' || phase === 'early'"
          type="button"
          class="reaction-btn reaction-btn--primary"
          @click="startRound"
        >
          다시 하기
        </button>
      </div>

      <p class="reaction-game__a11y">
        키보드: <kbd>Space</kbd> 또는 <kbd>Enter</kbd>로 시작·재시도·클릭 대체
      </p>
    </div>
  </div>
</template>
