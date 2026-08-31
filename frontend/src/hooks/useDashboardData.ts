import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchDashboard } from '../lib/api'
import type { DashboardResponse } from '../types'

type DashboardDataState = {
  data: DashboardResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  refresh: () => Promise<void>
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível carregar o dashboard.'
}

/** Loads dashboard data while keeping the most recent response authoritative. */
export function useDashboardData(): DashboardDataState {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dataRef = useRef<DashboardResponse | null>(null)
  const requestVersion = useRef(0)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current
    const hasData = dataRef.current !== null
    if (mounted.current) {
      if (hasData) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
    }

    try {
      const next = await fetchDashboard()
      if (!mounted.current || version !== requestVersion.current) {
        return
      }
      dataRef.current = next
      setData(next)
      setError(null)
    } catch (reason) {
      if (!mounted.current || version !== requestVersion.current) {
        return
      }
      setError(messageFromError(reason))
      throw reason
    } finally {
      if (mounted.current && version === requestVersion.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh().catch(() => undefined)
    return () => {
      mounted.current = false
      requestVersion.current += 1
    }
  }, [refresh])

  return { data, loading, refreshing, error, refresh }
}
