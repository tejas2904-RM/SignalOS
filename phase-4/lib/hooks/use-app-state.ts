'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'
import type { ComputedState, Signal, StatusChange } from '@/lib/types'
import { titleCaseStatus } from '@/lib/utils'

const fetcher = async (url: string): Promise<ComputedState> => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `Request failed (${res.status})`)
  }
  return res.json()
}

export type UiSheets = {
  signalOpen: boolean
  connectOpen: boolean
  editingSignal: Signal | null
  defaultThemeId?: string
}

export function useAppState() {
  const [visible, setVisible] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [sheets, setSheets] = useState<UiSheets>({
    signalOpen: false,
    connectOpen: false,
    editingSignal: null,
  })
  const prevRef = useRef<ComputedState | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const { data, error, isLoading, mutate, isValidating } = useSWR<ComputedState>(
    '/api/state',
    fetcher,
    {
      refreshInterval: visible ? 3000 : 0,
      revalidateOnFocus: true,
    },
  )

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === 'visible')
    onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  useEffect(() => {
    if (!data) return
    setLastSyncedAt(Date.now())
    const prev = prevRef.current
    if (prev) {
      const prevIds = new Set(prev.activity.map((a) => a.id))
      const fresh = data.activity.filter((a) => !prevIds.has(a.id))
      const claudeAdds = fresh.filter(
        (a) => a.via === 'claude' && /added \d+ signal/i.test(a.text),
      )
      if (claudeAdds.length > 0) {
        const n = claudeAdds.reduce((sum, a) => {
          const m = a.text.match(/added (\d+)/i)
          return sum + (m ? Number(m[1]) : 1)
        }, 0)
        toast.message(`✦ Claude added ${n} signal${n === 1 ? '' : 's'}`)
      }
      for (const a of fresh) {
        if (a.statusChange) {
          const from = titleCaseStatus(a.statusChange.from)
          const to = titleCaseStatus(a.statusChange.to)
          toast.message(a.text.replace(/:.+$/, '').trim() || a.text, {
            description: `${from} → ${to}`,
            action: a.themeId
              ? {
                  label: 'View',
                  onClick: () => {
                    window.location.href = `/themes/${a.themeId}`
                  },
                }
              : undefined,
          })
        }
      }
    }
    prevRef.current = data
  }, [data])

  const openNewSignal = useCallback((themeId?: string) => {
    setSheets({
      signalOpen: true,
      connectOpen: false,
      editingSignal: null,
      defaultThemeId: themeId,
    })
  }, [])

  const openEditSignal = useCallback((signal: Signal) => {
    setSheets({
      signalOpen: true,
      connectOpen: false,
      editingSignal: signal,
      defaultThemeId: signal.themeId,
    })
  }, [])

  const openConnect = useCallback(() => {
    setSheets((s) => ({ ...s, connectOpen: true, signalOpen: false }))
  }, [])

  const closeSheets = useCallback(() => {
    setSheets({
      signalOpen: false,
      connectOpen: false,
      editingSignal: null,
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      if (e.key === 'Escape') {
        closeSheets()
        return
      }
      if (typing) return
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        openNewSignal()
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault()
        openConnect()
      } else if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSheets, openConnect, openNewSignal])

  async function apiMutate<T>(
    input: RequestInfo,
    init?: RequestInit,
    optimistic?: (current: ComputedState | undefined) => ComputedState | undefined,
  ): Promise<T> {
    const previous = data
    try {
      if (optimistic) {
        await mutate(optimistic(data), { revalidate: false })
      }
      const res = await fetch(input, init)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error?.message || `Request failed (${res.status})`)
      }
      await mutate()
      return body as T
    } catch (err) {
      await mutate(previous, { revalidate: false })
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      throw err
    }
  }

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    lastSyncedAt,
    search,
    setSearch,
    searchRef,
    sheets,
    openNewSignal,
    openEditSignal,
    openConnect,
    closeSheets,
    apiMutate,
    resetDemo: async () => {
      await apiMutate('/api/reset', { method: 'POST' })
      toast.success('Demo data reset')
    },
  }
}

export type AppStateApi = ReturnType<typeof useAppState>

export function notifyStatusChanges(changes: StatusChange[]) {
  for (const c of changes) {
    toast.message(c.name, {
      description: `${titleCaseStatus(c.from)} → ${titleCaseStatus(c.to)}`,
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = `/themes/${c.themeId}`
        },
      },
    })
  }
}

export function filterThemes(
  state: ComputedState | undefined,
  search: string,
): ComputedState['themes'] {
  if (!state) return []
  const q = search.trim().toLowerCase()
  if (!q) return state.themes
  return state.themes.filter((t) => {
    if (t.name.toLowerCase().includes(q)) return true
    return state.signals.some(
      (s) => s.themeId === t.id && s.quote.toLowerCase().includes(q),
    )
  })
}
