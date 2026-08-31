import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import DashboardView from './DashboardView'
import type { DashboardResponse, ProblemSummary } from '../types'

const problems: ProblemSummary[] = [{
  id: 'problem-1', title: 'Two Sum', difficulty: 'EASY', categories: ['ARRAY'],
  progress: { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
}]

const dashboard: DashboardResponse = {
  summary: { totalProblems: 1, solvedProblems: 0, remainingProblems: 1, attemptedProblems: 0, completionPercentage: 0, favoriteProblems: 1, reviewProblems: 1 },
  byDifficulty: [
    { difficulty: 'EASY', totalProblems: 1, solvedProblems: 0, completionPercentage: 0 },
    { difficulty: 'MEDIUM', totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
    { difficulty: 'HARD', totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
  ],
  byCategory: [{ category: 'ARRAY', totalProblems: 1, solvedProblems: 0, completionPercentage: 0 }],
  recentSubmissions: [{ id: 'submission-1', problemId: 'problem-1', problemTitle: 'Two Sum', status: 'WRONG_ANSWER', testsPassed: 0, totalTests: 1, executionTimeMs: 10, submittedAt: '2026-08-30T10:00:00Z' }],
}

describe('DashboardView', () => {
  it('renders server metrics, category progress, shortcuts and recent activity', async () => {
    const user = userEvent.setup()
    const onOpenProblem = vi.fn()
    const onOpenFavorites = vi.fn()
    render(<DashboardView dashboard={dashboard} loading={false} refreshing={false} error={null} onRetry={vi.fn()} problems={problems} onOpenExercises={vi.fn()} onOpenFavorites={onOpenFavorites} onOpenReviews={vi.fn()} onOpenProblem={onOpenProblem} />)

    expect(screen.getByText('Seu espaço de estudos.')).toBeInTheDocument()
    expect(screen.getByText('Progresso por categoria')).toBeInTheDocument()
    expect(screen.getAllByText('Two Sum').length).toBeGreaterThan(0)
    expect(screen.getByText('Wrong Answer')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Favoritos/i }))
    expect(onOpenFavorites).toHaveBeenCalledOnce()
    await user.click(screen.getAllByRole('button', { name: /Two Sum/i })[0])
    expect(onOpenProblem).toHaveBeenCalledWith('problem-1')
  })

  it('renders an empty dashboard state without requiring catalog data', () => {
    render(<DashboardView dashboard={{ ...dashboard, summary: { ...dashboard.summary, totalProblems: 0, solvedProblems: 0, remainingProblems: 0, completionPercentage: 0 }, byCategory: [], recentSubmissions: [] }} loading={false} refreshing={false} error={null} onRetry={vi.fn()} problems={[]} onOpenExercises={vi.fn()} onOpenFavorites={vi.fn()} onOpenReviews={vi.fn()} onOpenProblem={vi.fn()} />)

    expect(screen.getByText('Nenhuma categoria disponível.')).toBeInTheDocument()
    expect(screen.getByText('Nenhuma submissão registrada.')).toBeInTheDocument()
    expect(screen.getByText('Todos os exercícios foram resolvidos.')).toBeInTheDocument()
  })

  it('shows an initial error with a retry action', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<DashboardView dashboard={null} loading={false} refreshing={false} error="Falha temporária" onRetry={onRetry} problems={[]} onOpenExercises={vi.fn()} onOpenFavorites={vi.fn()} onOpenReviews={vi.fn()} onOpenProblem={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Falha temporária')
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('keeps the dashboard visible while a refresh fails', () => {
    render(<DashboardView dashboard={dashboard} loading={false} refreshing={false} error="Não foi possível atualizar" onRetry={vi.fn()} problems={problems} onOpenExercises={vi.fn()} onOpenFavorites={vi.fn()} onOpenReviews={vi.fn()} onOpenProblem={vi.fn()} />)

    expect(screen.getByText('Seu espaço de estudos.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível atualizar')
  })

  it('renders an explicit loading state', () => {
    render(<DashboardView dashboard={null} loading refreshing={false} error={null} onRetry={vi.fn()} problems={[]} onOpenExercises={vi.fn()} onOpenFavorites={vi.fn()} onOpenReviews={vi.fn()} onOpenProblem={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando dashboard')
  })
})
