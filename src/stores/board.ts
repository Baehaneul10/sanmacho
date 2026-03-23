import { defineStore } from 'pinia'
import { apiBaseForFetch } from '../lib/api'
import type { BoardPost } from '../types/board'

const STORAGE_KEY = 'portfolio-board-posts'

function isBoardPost(value: unknown): value is BoardPost {
  if (value === null || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.title === 'string' &&
    typeof o.author === 'string' &&
    typeof o.body === 'string' &&
    typeof o.createdAt === 'number'
  )
}

function loadLocal(): BoardPost[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isBoardPost)
  } catch {
    return []
  }
}

function saveLocal(posts: BoardPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

export const useBoardStore = defineStore('board', {
  state: () => ({
    posts: [] as BoardPost[],
    source: 'local' as 'local' | 'api',
    loadError: null as string | null,
  }),
  actions: {
    async hydrate() {
      const base = apiBaseForFetch()
      this.loadError = null
      try {
        const r = await fetch(`${base}/api/board/posts`)
        if (!r.ok) throw new Error('fetch_failed')
        const data = (await r.json()) as { posts?: unknown }
        const list = Array.isArray(data.posts) ? data.posts.filter(isBoardPost) : []
        this.posts = list
        this.source = 'api'
        return
      } catch {
        this.loadError = 'api_unavailable'
      }
      this.posts = loadLocal()
      this.source = 'local'
    },
    async addPost(input: { title: string; author: string; body: string }) {
      if (!input.author.trim() || !input.body.trim()) return
      const base = apiBaseForFetch()
      if (this.source === 'api') {
        const r = await fetch(`${base}/api/board/posts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: input.title,
            author: input.author,
            body: input.body,
          }),
        })
        if (!r.ok) throw new Error('post_failed')
        await this.hydrate()
        return
      }
      const post: BoardPost = {
        id: crypto.randomUUID(),
        title: input.title.trim() || '(제목 없음)',
        author: input.author.trim(),
        body: input.body.trim(),
        createdAt: Date.now(),
      }
      this.posts = [post, ...this.posts]
      saveLocal(this.posts)
    },
  },
})
