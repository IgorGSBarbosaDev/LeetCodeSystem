import { useCallback, useRef, useState } from 'react'

import { updateProblemProgress } from '../lib/api'
import type { ProgressUpdate } from '../lib/api'
import type { ProblemDetails, ProblemSummary } from '../types'

type UseProblemProgressOptions = {
  setProblems: React.Dispatch<React.SetStateAction<ProblemSummary[]>>
  setSelectedProblem: React.Dispatch<React.SetStateAction<ProblemDetails | null>>
  refreshDashboard: () => Promise<void>
  onError: (error: unknown, fallback: string) => void
}

/** Coordinates pessimistic progress mutations and keeps every open view in sync. */
export function useProblemProgress({
  setProblems,
  setSelectedProblem,
  refreshDashboard,
  onError,
}: UseProblemProgressOptions) {
  const [pending, setPending] = useState<Record<string, boolean>>({})
  const pendingRef = useRef<Record<string, boolean>>({})

  const update = useCallback(async (problemId: string, change: ProgressUpdate) => {
    if (pendingRef.current[problemId]) return

    pendingRef.current[problemId] = true
    setPending((current) => ({ ...current, [problemId]: true }))
    try {
      const progress = await updateProblemProgress(problemId, change)
      setProblems((current) => current.map((problem) => problem.id === problemId ? { ...problem, progress } : problem))
      setSelectedProblem((current) => current?.id === problemId ? { ...current, progress } : current)
      try {
        await refreshDashboard()
      } catch (error) {
        onError(error, 'Progresso salvo, mas o dashboard não foi atualizado.')
      }
    } catch (error) {
      onError(error, 'Não foi possível salvar o progresso.')
    } finally {
      delete pendingRef.current[problemId]
      setPending((current) => {
        const next = { ...current }
        delete next[problemId]
        return next
      })
    }
  }, [onError, refreshDashboard, setProblems, setSelectedProblem])

  return { pending, update }
}
