export type ExpenseCategoryId = 'food' | 'transport' | 'culture' | 'shopping' | 'sub' | 'etc'

export type Expense = {
  id: string
  amount: number
  categoryId: ExpenseCategoryId
  label: string
  spentAt: string
}

export type ExpenseCategoryMeta = {
  id: ExpenseCategoryId
  label: string
  district: string
  emoji: string
}

export const EXPENSE_CATEGORIES: ExpenseCategoryMeta[] = [
  { id: 'food', label: '식비', district: '먹거리 골목', emoji: '🍜' },
  { id: 'transport', label: '교통', district: '이동 허브', emoji: '🚇' },
  { id: 'culture', label: '문화', district: '야경 극장가', emoji: '🎬' },
  { id: 'shopping', label: '쇼핑', district: '네온 상가', emoji: '🛍️' },
  { id: 'sub', label: '구독', district: '클라우드 타워', emoji: '☁️' },
  { id: 'etc', label: '기타', district: '자유 시장', emoji: '✨' },
]
