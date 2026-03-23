<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useExpenseGameStore } from '../stores/expenseGame'
import { EXPENSE_CATEGORIES, type ExpenseCategoryId } from '../types/expenseGame'
import './SpendingGame.css'

const game = useExpenseGameStore()
const {
  viewMonth,
  monthTotal,
  cityVitality,
  cityPhase,
  character,
  cityHeadline,
  monthLabel,
  budgetRatio,
  categoryTotals,
  categoryShares,
  canGoNext,
  loadError,
  source,
} = storeToRefs(game)

const submitError = ref<string | null>(null)

onMounted(async () => {
  await game.hydrate()
  budgetInput.value = String(game.monthlyBudget)
})

const amount = ref<number | ''>('')
const categoryId = ref<ExpenseCategoryId>('food')
const label = ref('')
const spentDate = ref(new Date().toISOString().slice(0, 10))
const budgetInput = ref(String(game.monthlyBudget))

const skyClass = computed(() => {
  switch (cityPhase.value) {
    case 'golden':
      return 'sg-sky sg-sky--golden'
    case 'stable':
      return 'sg-sky sg-sky--stable'
    case 'pressure':
      return 'sg-sky sg-sky--pressure'
    case 'smog':
      return 'sg-sky sg-sky--smog'
    default:
      return 'sg-sky sg-sky--crisis'
  }
})

const smogOpacity = computed(() => {
  const r = budgetRatio.value
  if (r <= 1) return 0
  return Math.min(0.85, (r - 1) * 1.4)
})

function hashSeed(s: string, i: number): number {
  const str = `${s}:${i}`
  let h = 2166136261
  for (let k = 0; k < str.length; k++) {
    h ^= str.charCodeAt(k)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % 100
}

const buildings = computed(() => {
  const v = cityVitality.value
  const m = viewMonth.value
  return [0, 1, 2, 3, 4].map((i) => {
    const jitter = hashSeed(m, i) * 0.12
    const h = Math.min(100, 22 + v * 0.58 + jitter * 18)
    return { i, heightPct: Math.round(h * 10) / 10, delay: (i * 0.12).toFixed(2) }
  })
})

const topDistrict = computed(() => {
  const totals = categoryTotals.value
  let maxId: ExpenseCategoryId = 'food'
  let max = -1
  ;(Object.keys(totals) as ExpenseCategoryId[]).forEach((id) => {
    if (totals[id] > max) {
      max = totals[id]
      maxId = id
    }
  })
  const meta = EXPENSE_CATEGORIES.find((c) => c.id === maxId)
  return {
    meta,
    amount: max <= 0 ? 0 : max,
    share: monthTotal.value > 0 ? Math.round((max / monthTotal.value) * 100) : 0,
  }
})

const budgetPulseLabel = computed(() => {
  const r = budgetRatio.value
  if (r <= 0.55) return '넉넉'
  if (r <= 0.85) return '양호'
  if (r <= 1) return '주의'
  if (r <= 1.2) return '위험'
  return '초과'
})

function formatWon(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n) + '원'
}

async function onSubmit() {
  submitError.value = null
  const raw = amount.value === '' ? NaN : Number(amount.value)
  if (!Number.isFinite(raw) || raw <= 0) return
  try {
    await game.addExpense({
      amount: raw,
      categoryId: categoryId.value,
      label: label.value,
      spentAt: spentDate.value,
    })
    amount.value = ''
    label.value = ''
  } catch {
    submitError.value = '저장에 실패했습니다. API·DB 연결을 확인해 주세요.'
  }
}

async function syncBudgetFromInput() {
  submitError.value = null
  const n = Number(String(budgetInput.value).replace(/,/g, ''))
  try {
    await game.setBudget(n)
    budgetInput.value = String(game.monthlyBudget)
  } catch {
    submitError.value = '예산 저장에 실패했습니다.'
  }
}

async function onRemoveExpense(id: string) {
  submitError.value = null
  try {
    await game.removeExpense(id)
  } catch {
    submitError.value = '삭제에 실패했습니다.'
  }
}

function districtClass(id: ExpenseCategoryId): string {
  const share = categoryShares.value[id]
  if (share <= 0) return 'sg-district sg-district--idle'
  if (share >= 35) return 'sg-district sg-district--hot'
  if (share >= 18) return 'sg-district sg-district--warm'
  return 'sg-district sg-district--lit'
}

function districtStyle(id: ExpenseCategoryId): Record<string, string> {
  const share = categoryShares.value[id]
  const glow = 0.15 + (share / 100) * 0.95
  return { '--glow': String(glow) }
}
</script>

<template>
  <div class="sg-page">
    <header class="sg-header">
      <p class="sg-eyebrow">Portfolio demo · Pinia</p>
      <h1 class="sg-title">나만의 소비 도시</h1>
      <p class="sg-lead">
        지출을 기록하면 상권이 살아나고, 도시와 시장(캐릭터) 상태가 바뀌는 가벼운 시뮬레이션입니다. 막대그래프 대신
        <strong>도시의 분위기</strong>로 한 달 리듬을 봅니다.
      </p>
      <RouterLink class="sg-back" :to="{ name: 'project' }">← 프로젝트 목록</RouterLink>
    </header>

    <p v-if="loadError" class="sg-banner sg-banner--warn">
      서버 API에 연결하지 못해 브라우저 저장소 데이터를 쓰고 있습니다. 실서버에서는 nginx의
      <code>/api/</code> 프록시와 MariaDB·Node API를 켜 주세요.
    </p>
    <p v-else-if="source === 'api'" class="sg-banner sg-banner--ok">
      데이터: <strong>MariaDB</strong> (API 동기화)
    </p>
    <p v-if="submitError" class="sg-banner sg-banner--error">{{ submitError }}</p>

    <div class="sg-shell">
      <section class="sg-city" :aria-label="`${monthLabel} 도시 상태`">
        <div :class="skyClass">
          <div v-if="cityPhase === 'golden'" class="sg-sparkles" aria-hidden="true" />
          <div class="sg-smog" :style="{ opacity: smogOpacity }" aria-hidden="true" />

          <div class="sg-cityscape">
            <div
              v-for="b in buildings"
              :key="b.i"
              class="sg-building"
              :style="{ height: `${b.heightPct}%`, animationDelay: `${b.delay}s` }"
            />
          </div>

          <div class="sg-horizon">
            <p class="sg-headline">{{ cityHeadline }}</p>
            <p class="sg-sub">{{ monthLabel }} · 활력 {{ cityVitality }}</p>
          </div>
        </div>

        <div class="sg-mayor">
          <div class="sg-mayor__emoji" aria-hidden="true">{{ character.emoji }}</div>
          <div class="sg-mayor__text">
            <p class="sg-mayor__title">{{ character.title }}</p>
            <p class="sg-mayor__body">{{ character.body }}</p>
          </div>
        </div>
      </section>

      <div class="sg-grid">
        <section class="sg-card">
          <h2 class="sg-card__h">지출 입력</h2>
          <form class="sg-form" @submit.prevent="() => void onSubmit()">
            <label class="sg-field">
              <span>금액 (원)</span>
              <input v-model.number="amount" type="number" min="1" step="1" placeholder="12000" required />
            </label>
            <label class="sg-field">
              <span>카테고리</span>
              <select v-model="categoryId">
                <option v-for="c in EXPENSE_CATEGORIES" :key="c.id" :value="c.id">
                  {{ c.emoji }} {{ c.label }} — {{ c.district }}
                </option>
              </select>
            </label>
            <label class="sg-field">
              <span>메모 (선택)</span>
              <input v-model="label" maxlength="80" placeholder="점심 약속" />
            </label>
            <label class="sg-field">
              <span>날짜</span>
              <input v-model="spentDate" type="date" required />
            </label>
            <button type="submit" class="sg-btn sg-btn--primary">기록 → 도시에 반영</button>
          </form>
        </section>

        <section class="sg-card">
          <h2 class="sg-card__h">이번 달 예산</h2>
          <p class="sg-muted">예산은 도시의 ‘체력 바’ 기준이 됩니다. 줄이면 더 빡빡해지고, 늘리면 숨통이 트여요.</p>
          <div class="sg-budget-row">
            <input v-model="budgetInput" class="sg-budget-input" type="text" inputmode="numeric" />
            <button type="button" class="sg-btn" @click="syncBudgetFromInput">적용</button>
          </div>
          <div class="sg-month-nav">
            <button type="button" class="sg-btn sg-btn--ghost" @click="game.shiftMonth(-1)">◀ 이전 달</button>
            <span class="sg-month-pill">{{ monthLabel }}</span>
            <button type="button" class="sg-btn sg-btn--ghost" :disabled="!canGoNext" @click="game.shiftMonth(1)">
              다음 달 ▶
            </button>
          </div>
        </section>
      </div>

      <section class="sg-card sg-card--wide">
        <h2 class="sg-card__h">월간 시티 리포트</h2>
        <p class="sg-muted">숫자는 그대로지만, 해석은 게임 쪽 언어로만 보여요.</p>
        <ul class="sg-stats" role="list">
          <li class="sg-stat sg-stat--energy">
            <span class="sg-stat__k">이번 달 에너지 소모</span>
            <span class="sg-stat__v">{{ formatWon(monthTotal) }}</span>
            <span class="sg-stat__t">지출 합계</span>
          </li>
          <li class="sg-stat sg-stat--shield">
            <span class="sg-stat__k">도시 탄력</span>
            <span class="sg-stat__v">{{ budgetPulseLabel }} · {{ Math.round(budgetRatio * 100) }}%</span>
            <span class="sg-stat__t">예산 대비 흐름</span>
          </li>
          <li class="sg-stat sg-stat--focus">
            <span class="sg-stat__k">집중 상권</span>
            <span class="sg-stat__v">
              <template v-if="topDistrict.meta && topDistrict.amount > 0">
                {{ topDistrict.meta.emoji }} {{ topDistrict.meta.district }} ({{ topDistrict.share }}%)
              </template>
              <template v-else>—</template>
            </span>
            <span class="sg-stat__t">이번 달 소비가 모인 곳</span>
          </li>
        </ul>
      </section>

      <section class="sg-card sg-card--wide">
        <h2 class="sg-card__h">카테고리 상권 분석</h2>
        <p class="sg-muted">비율은 네온 밝기로만 표현해요. (실제 차트 없음)</p>
        <ul class="sg-districts" role="list">
          <li
            v-for="c in EXPENSE_CATEGORIES"
            :key="c.id"
            :class="districtClass(c.id)"
            :style="districtStyle(c.id)"
          >
            <span class="sg-district__emoji">{{ c.emoji }}</span>
            <div class="sg-district__body">
              <span class="sg-district__name">{{ c.district }}</span>
              <span class="sg-district__meta">{{ c.label }} · {{ formatWon(categoryTotals[c.id]) }}</span>
              <span class="sg-district__share" v-if="monthTotal > 0">{{ categoryShares[c.id] }}% 기여</span>
            </div>
          </li>
        </ul>
      </section>

      <section class="sg-card sg-card--wide">
        <h2 class="sg-card__h">최근 기록</h2>
        <ul v-if="game.expensesInMonth.length" class="sg-log" role="list">
          <li v-for="e in game.expensesInMonth" :key="e.id" class="sg-log__row">
            <div class="sg-log__main">
              <span class="sg-log__amt">{{ formatWon(e.amount) }}</span>
              <span class="sg-log__lbl">{{ e.label }}</span>
              <span class="sg-log__date">{{ e.spentAt }}</span>
            </div>
            <button type="button" class="sg-log__del" @click="() => void onRemoveExpense(e.id)">취소</button>
          </li>
        </ul>
        <p v-else class="sg-muted">이 달에는 아직 기록이 없어요. 한 줄만 적어도 상권이 깜빡입니다.</p>
      </section>
    </div>
  </div>
</template>
