import { defineStore } from 'pinia'
import { apiBaseForFetch } from '../lib/api'
import type { Expense, ExpenseCategoryId } from '../types/expenseGame'

const STORAGE_KEY = 'portfolio-expense-game'
const STORAGE_VIEW = 'portfolio-expense-game-view'

const CATEGORY_SET = new Set<ExpenseCategoryId>([
  'food',
  'transport',
  'culture',
  'shopping',
  'sub',
  'etc',
])

type PersistShape = {
  expenses: Expense[]
  monthlyBudget: number
  viewMonth: string
}

function ym(d: Date): string {
  return d.toISOString().slice(0, 7)
}

function isExpense(v: unknown): v is Expense {
  if (v === null || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  if (
    typeof o.id !== 'string' ||
    typeof o.amount !== 'number' ||
    o.amount < 0 ||
    typeof o.categoryId !== 'string' ||
    typeof o.label !== 'string' ||
    typeof o.spentAt !== 'string'
  ) {
    return false
  }
  return CATEGORY_SET.has(o.categoryId as ExpenseCategoryId)
}

function loadPersist(): PersistShape | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    const o = parsed as Record<string, unknown>
    const expensesRaw = o.expenses
    const expenses = Array.isArray(expensesRaw) ? expensesRaw.filter(isExpense) : []
    const monthlyBudget =
      typeof o.monthlyBudget === 'number' && o.monthlyBudget >= 0 ? o.monthlyBudget : 800_000
    const viewMonth = typeof o.viewMonth === 'string' && /^\d{4}-\d{2}$/.test(o.viewMonth) ? o.viewMonth : ym(new Date())
    return { expenses, monthlyBudget, viewMonth }
  } catch {
    return null
  }
}

function savePersist(data: PersistShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function loadViewMonth(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_VIEW)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    const vm = (parsed as Record<string, unknown>).viewMonth
    return typeof vm === 'string' && /^\d{4}-\d{2}$/.test(vm) ? vm : null
  } catch {
    return null
  }
}

function saveViewMonth(viewMonth: string) {
  localStorage.setItem(STORAGE_VIEW, JSON.stringify({ viewMonth }))
}

function initialViewMonth(): string {
  return loadViewMonth() ?? loadPersist()?.viewMonth ?? ym(new Date())
}

export const useExpenseGameStore = defineStore('expenseGame', {
  state: () => {
    const loaded = loadPersist()
    return {
      expenses: loaded?.expenses ?? ([] as Expense[]),
      monthlyBudget: loaded?.monthlyBudget ?? 800_000,
      viewMonth: initialViewMonth(),
      source: 'local' as 'local' | 'api',
      loadError: null as string | null,
    }
  },
  getters: {
    safeBudget(state): number {
      return Math.max(state.monthlyBudget, 10_000)
    },
    expensesInMonth(state): Expense[] {
      const prefix = state.viewMonth
      return state.expenses.filter((e) => e.spentAt.startsWith(prefix))
    },
    monthTotal(): number {
      return this.expensesInMonth.reduce((s, e) => s + e.amount, 0)
    },
    budgetRatio(): number {
      return this.monthTotal / this.safeBudget
    },
    cityVitality(): number {
      const r = this.budgetRatio
      return Math.round(Math.max(0, Math.min(100, 100 - Math.min(100, r * 62))))
    },
    categoryTotals(): Record<ExpenseCategoryId, number> {
      const base: Record<ExpenseCategoryId, number> = {
        food: 0,
        transport: 0,
        culture: 0,
        shopping: 0,
        sub: 0,
        etc: 0,
      }
      for (const e of this.expensesInMonth) {
        if (e.categoryId in base) base[e.categoryId] += e.amount
      }
      return base
    },
    categoryShares(): Record<ExpenseCategoryId, number> {
      const t = this.monthTotal
      const totals = this.categoryTotals
      const out = { ...totals }
      if (t <= 0) {
        ;(Object.keys(out) as ExpenseCategoryId[]).forEach((k) => {
          out[k] = 0
        })
        return out
      }
      ;(Object.keys(out) as ExpenseCategoryId[]).forEach((k) => {
        out[k] = Math.round((totals[k] / t) * 1000) / 10
      })
      return out
    },
    cityPhase(): 'golden' | 'stable' | 'pressure' | 'smog' | 'crisis' {
      const v = this.cityVitality
      const r = this.budgetRatio
      if (r > 1.15) return 'crisis'
      if (r > 1) return 'smog'
      if (v >= 72) return 'golden'
      if (v >= 45) return 'stable'
      return 'pressure'
    },
    character(): { emoji: string; title: string; body: string } {
      const v = this.cityVitality
      const r = this.budgetRatio
      if (v >= 82) {
        return {
          emoji: '🌟',
          title: '시장 — 여유로운 오늘',
          body: '지출 리듬이 안정적이에요. 도시가 반짝이고 있어요.',
        }
      }
      if (v >= 60) {
        return {
          emoji: '🙂',
          title: '시장 — 무난한 운영',
          body: '예산 안에서 잘 돌아가는 중. 가끔 호흡을 고르게 해볼까요?',
        }
      }
      if (v >= 38) {
        return {
          emoji: '😮‍💨',
          title: '시장 — 바쁜 한 주',
          body: '지출이 조금 빡빡해요. 우선순위만 다시 정리해도 도시가 숨 쉬어요.',
        }
      }
      if (r <= 1.08) {
        return {
          emoji: '😰',
          title: '시장 — 경보',
          body: '예산에 거의 닿았어요. 작은 지출부터 한 번에 모아볼까요?',
        }
      }
      return {
        emoji: '🌪️',
        title: '시장 — 과소비 폭풍',
        body: '이번 달은 예산을 넘겼어요. 도시에 스모그가 끼었어요. 다음 달 회복 이벤트를 열어봐요.',
      }
    },
    cityHeadline(): string {
      switch (this.cityPhase) {
        case 'golden':
          return '도시 번영 이벤트 진행 중'
        case 'stable':
          return '도시가 안정 궤도에 있음'
        case 'pressure':
          return '도시 에너지가 다소 고갈됨'
        case 'smog':
          return '과소비 스모그 경보'
        default:
          return '도시 비상 사태 — 예산 초과'
      }
    },
    monthLabel(): string {
      const [y, m] = this.viewMonth.split('-').map(Number)
      return `${y}년 ${m}월`
    },
    prevMonthKey(): string {
      const [y, m] = this.viewMonth.split('-').map(Number)
      const d = new Date(y, m - 2, 1)
      return ym(d)
    },
    nextMonthKey(): string {
      const [y, m] = this.viewMonth.split('-').map(Number)
      const d = new Date(y, m, 1)
      return ym(d)
    },
    canGoNext(): boolean {
      return this.nextMonthKey <= ym(new Date())
    },
  },
  actions: {
    persistLocal() {
      if (this.source === 'api') {
        saveViewMonth(this.viewMonth)
        return
      }
      savePersist({
        expenses: this.expenses,
        monthlyBudget: this.monthlyBudget,
        viewMonth: this.viewMonth,
      })
    },
    async hydrate() {
      const base = apiBaseForFetch()
      const keepMonth = this.viewMonth
      this.loadError = null
      try {
        const r = await fetch(`${base}/api/expenses/state`)
        if (!r.ok) throw new Error('fetch_failed')
        const data = (await r.json()) as {
          expenses?: unknown
          monthlyBudget?: unknown
        }
        const raw = Array.isArray(data.expenses) ? data.expenses : []
        const expenses = raw.filter(isExpense)
        const mb =
          typeof data.monthlyBudget === 'number' && data.monthlyBudget >= 10_000
            ? Math.round(data.monthlyBudget)
            : 800_000
        this.expenses = expenses
        this.monthlyBudget = mb
        this.viewMonth = keepMonth
        this.source = 'api'
        saveViewMonth(this.viewMonth)
        return
      } catch {
        this.loadError = 'api_unavailable'
      }
      const loaded = loadPersist()
      if (loaded) {
        this.expenses = loaded.expenses
        this.monthlyBudget = loaded.monthlyBudget
        this.viewMonth = loadViewMonth() ?? loaded.viewMonth
      }
      this.source = 'local'
      this.persistLocal()
    },
    async setBudget(amount: number) {
      if (!Number.isFinite(amount) || amount < 10_000) return
      const rounded = Math.round(amount)
      if (this.source === 'api') {
        const base = apiBaseForFetch()
        const r = await fetch(`${base}/api/expenses/budget`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monthlyBudget: rounded }),
        })
        if (!r.ok) throw new Error('budget_failed')
        await this.hydrate()
        return
      }
      this.monthlyBudget = rounded
      this.persistLocal()
    },
    shiftMonth(delta: -1 | 1) {
      const next = delta === -1 ? this.prevMonthKey : this.nextMonthKey
      if (delta === 1 && next > ym(new Date())) return
      this.viewMonth = next
      this.persistLocal()
    },
    async addExpense(payload: { amount: number; categoryId: ExpenseCategoryId; label: string; spentAt: string }) {
      if (!Number.isFinite(payload.amount) || payload.amount <= 0) return
      const label = payload.label.trim() || '(메모 없음)'
      const spentAt = payload.spentAt.slice(0, 10)
      if (this.source === 'api') {
        const base = apiBaseForFetch()
        const r = await fetch(`${base}/api/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(payload.amount),
            categoryId: payload.categoryId,
            label,
            spentAt,
          }),
        })
        if (!r.ok) throw new Error('post_failed')
        await this.hydrate()
        return
      }
      const id = crypto.randomUUID()
      this.expenses.unshift({
        id,
        amount: Math.round(payload.amount),
        categoryId: payload.categoryId,
        label,
        spentAt,
      })
      this.persistLocal()
    },
    async removeExpense(id: string) {
      if (this.source === 'api') {
        const base = apiBaseForFetch()
        const r = await fetch(`${base}/api/expenses/${encodeURIComponent(id)}`, { method: 'DELETE' })
        if (!r.ok) throw new Error('delete_failed')
        await this.hydrate()
        return
      }
      this.expenses = this.expenses.filter((e) => e.id !== id)
      this.persistLocal()
    },
  },
})
