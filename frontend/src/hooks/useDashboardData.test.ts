import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchDashboard } from '../lib/api'
import type { DashboardResponse } from '../types'
import { useDashboardData } from './useDashboardData'

vi.mock('../lib/api', () => ({
  fetchDashboard: vi.fn(),
}))

const fetchDashboardMock = vi.mocked(fetchDashboard)

const dashboard = (solvedProblems: number): DashboardResponse => ({
  summary: { totalProblems: 2, solvedProblems, remainingProblems: 2 - solvedProblems, attemptedProblems: 0, completionPercentage: solvedProblems * 50, favoriteProblems: 0, reviewProblems: 0 },
  byDifficulty: [
    { difficulty: 'EASY', totalProblems: 2, solvedProblems, completionPercentage: solvedProblems * 50 },
    { difficulty: 'MEDIUM', totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
    { difficulty: 'HARD', totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
  ],
  byCategory: [],
  recentSubmissions: [],
})

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('useDashboardData', () => {
  beforeEach(() => {
    fetchDashboardMock.mockReset()
  })

  it('exposes loading, error, retry and preserves valid data on refresh failure', async () => {
    fetchDashboardMock.mockResolvedValueOnce(dashboard(1)).mockRejectedValueOnce(new Error('dashboard offline')).mockResolvedValueOnce(dashboard(2))
    const { result } = renderHook(() => useDashboardData())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.data?.summary.solvedProblems).toBe(1))
    expect(result.current.loading).toBe(false)

    await act(async () => {
      await expect(result.current.refresh()).rejects.toThrow('dashboard offline')
    })
    expect(result.current.data?.summary.solvedProblems).toBe(1)
    expect(result.current.error).toBe('dashboard offline')
    expect(result.current.refreshing).toBe(false)

    await act(async () => { await result.current.refresh() })
    expect(result.current.data?.summary.solvedProblems).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('keeps the initial error until a user-triggered retry succeeds', async () => {
    fetchDashboardMock.mockRejectedValueOnce(new Error('initial offline')).mockResolvedValueOnce(dashboard(0))
    const { result } = renderHook(() => useDashboardData())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('initial offline')

    await act(async () => { await result.current.refresh() })
    expect(result.current.data?.summary.solvedProblems).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('applies latest-write-wins when the initial request resolves after a refresh', async () => {
    const initial = deferred<DashboardResponse>()
    const refresh = deferred<DashboardResponse>()
    fetchDashboardMock.mockReturnValueOnce(initial.promise).mockReturnValueOnce(refresh.promise)
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(fetchDashboardMock).toHaveBeenCalledTimes(1))

    let refreshPromise!: Promise<void>
    await act(async () => {
      refreshPromise = result.current.refresh()
      refresh.resolve(dashboard(2))
      await refreshPromise
    })
    expect(result.current.data?.summary.solvedProblems).toBe(2)

    await act(async () => {
      initial.resolve(dashboard(0))
      await initial.promise
    })
    expect(result.current.data?.summary.solvedProblems).toBe(2)
  })

  it('ignores an older failure after a newer successful refresh', async () => {
    const first = deferred<DashboardResponse>()
    const second = deferred<DashboardResponse>()
    fetchDashboardMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useDashboardData())
    await waitFor(() => expect(fetchDashboardMock).toHaveBeenCalledTimes(1))

    let latest!: Promise<void>
    await act(async () => {
      latest = result.current.refresh()
      second.resolve(dashboard(1))
      await latest
    })
    await act(async () => {
      first.reject(new Error('stale failure'))
      await first.promise.catch(() => undefined)
    })

    expect(result.current.data?.summary.solvedProblems).toBe(1)
    expect(result.current.error).toBeNull()
  })

  it('keeps the second of two concurrent refreshes authoritative', async () => {
    const initial = deferred<DashboardResponse>()
    const firstRefresh = deferred<DashboardResponse>()
    const secondRefresh = deferred<DashboardResponse>()
    fetchDashboardMock.mockReturnValueOnce(initial.promise).mockReturnValueOnce(firstRefresh.promise).mockReturnValueOnce(secondRefresh.promise)
    const { result } = renderHook(() => useDashboardData())
    initial.resolve(dashboard(0))
    await waitFor(() => expect(result.current.data?.summary.solvedProblems).toBe(0))

    let firstPromise!: Promise<void>
    let secondPromise!: Promise<void>
    await act(async () => {
      firstPromise = result.current.refresh()
      secondPromise = result.current.refresh()
      secondRefresh.resolve(dashboard(2))
      await secondPromise
    })
    await act(async () => {
      firstRefresh.resolve(dashboard(1))
      await firstPromise
    })

    expect(result.current.data?.summary.solvedProblems).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('does not update state when unmounted before a response', async () => {
    const pending = deferred<DashboardResponse>()
    fetchDashboardMock.mockReturnValueOnce(pending.promise)
    const { result, unmount } = renderHook(() => useDashboardData())
    await waitFor(() => expect(fetchDashboardMock).toHaveBeenCalledTimes(1))
    unmount()

    await act(async () => {
      pending.resolve(dashboard(1))
      await pending.promise
    })
    expect(result.current.data).toBeNull()
  })
})
