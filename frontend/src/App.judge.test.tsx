import { useState } from 'react'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CodeExecutionResult, ProblemDetails, ProblemSummary } from './types'

vi.mock('@monaco-editor/react', () => ({
  default: function MonacoMock({ value, onChange, options }: { value: string; onChange: (value: string) => void; options?: { readOnly?: boolean } }) {
    const [currentValue, setCurrentValue] = useState(value)
    return (
      <textarea
        aria-label="Editor de solução"
        value={currentValue}
        readOnly={options?.readOnly}
        onChange={(event) => {
          setCurrentValue(event.target.value)
          onChange(event.target.value)
        }}
      />
    )
  },
}))

import App from './App'

const summary: ProblemSummary = {
  id: 'two-sum-001',
  title: 'Two Sum',
  difficulty: 'EASY',
  categories: ['ARRAY'],
  progress: { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
}

const details: ProblemDetails = {
  ...summary,
  description: 'Encontre os índices.',
  constraints: ['Há uma solução.'],
  examples: [{ input: 'nums = [2, 7]', output: '[0, 1]' }],
  method: { name: 'twoSum', returnType: 'int[]', parameters: [{ name: 'nums', type: 'int[]' }, { name: 'target', type: 'int' }] },
  starterCode: { java: 'class Solution {}' },
  testCases: [{ input: { nums: [2, 7], target: 9 }, expectedOutput: [0, 1], hidden: false }],
  hiddenTestCaseCount: 1,
}

const dashboard = {
  summary: { totalProblems: 1, solvedProblems: 1, remainingProblems: 0, attemptedProblems: 0, completionPercentage: 100, favoriteProblems: 0, reviewProblems: 0 },
  byDifficulty: [
    { difficulty: 'EASY' as const, totalProblems: 1, solvedProblems: 1, completionPercentage: 100 },
    { difficulty: 'MEDIUM' as const, totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
    { difficulty: 'HARD' as const, totalProblems: 0, solvedProblems: 0, completionPercentage: 0 },
  ],
  byCategory: [{ category: 'ARRAY', totalProblems: 1, solvedProblems: 0, completionPercentage: 0 }],
  recentSubmissions: [],
}

const wrongRun: CodeExecutionResult = {
  status: 'WRONG_ANSWER',
  testsPassed: 0,
  totalTests: 1,
  executionTimeMs: 12,
  testResults: [{ index: 0, hidden: false, status: 'WRONG_ANSWER', input: { nums: [2, 7], target: 9 }, expectedOutput: [0, 1], actualOutput: [], executionTimeMs: 12 }],
}

const acceptedSubmit: CodeExecutionResult = {
  status: 'ACCEPTED',
  testsPassed: 2,
  totalTests: 2,
  executionTimeMs: 21,
  testResults: [
    { index: 0, hidden: false, status: 'ACCEPTED', input: { nums: [2, 7], target: 9 }, expectedOutput: [0, 1], actualOutput: [0, 1], executionTimeMs: 10 },
    { index: 1, hidden: true, status: 'ACCEPTED', input: { secret: 'HIDDEN_INPUT' }, expectedOutput: 'HIDDEN_EXPECTED', actualOutput: 'HIDDEN_ACTUAL', error: 'HIDDEN_ERROR', executionTimeMs: 11 },
  ],
}

afterEach(() => vi.restoreAllMocks())

function response(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

describe('Judge integration in the solver', () => {
  it('runs public tests, submits all tests and refreshes the Dashboard while keeping the modal open', async () => {
    const user = userEvent.setup()
    const solvedSummary = { ...summary, progress: { ...summary.progress, status: 'SOLVED' as const, attempts: 1 } }
    const solvedDetails = { ...details, progress: solvedSummary.progress }
    let dashboardReads = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (url === '/api/dashboard' && method === 'GET') return response(++dashboardReads === 1 ? {
        ...dashboard,
        summary: { ...dashboard.summary, solvedProblems: 0, remainingProblems: 1, completionPercentage: 0 },
        byDifficulty: dashboard.byDifficulty.map((level) => level.difficulty === 'EASY' ? { ...level, solvedProblems: 0, completionPercentage: 0 } : level),
        byCategory: dashboard.byCategory.map((category) => ({ ...category, solvedProblems: 0, completionPercentage: 0 })),
      } : dashboard)
      if (url === '/api/problems' && method === 'GET') {
        return response(fetchMock.mock.calls.filter(([request, requestInit]) => String(request) === '/api/problems' && (requestInit?.method ?? 'GET') === 'GET').length > 1 ? [solvedSummary] : [summary])
      }
      if (url === '/api/problems/two-sum-001' && method === 'GET') {
        return response(fetchMock.mock.calls.some(([request, requestInit]) => String(request) === '/api/problems/two-sum-001/submit' && requestInit?.method === 'POST') ? solvedDetails : details)
      }
      if (url === '/api/problems/two-sum-001/run' && method === 'POST') return response(wrongRun)
      if (url === '/api/problems/two-sum-001/submit' && method === 'POST') return response(acceptedSubmit)
      throw new Error(`Unexpected request: ${method} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    await screen.findByRole('button', { name: 'Run' })

    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(await screen.findAllByText('Wrong Answer')).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([request, requestInit]) => String(request).endsWith('/run') && requestInit?.method === 'POST')).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([request]) => String(request) === '/api/problems')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Submit' }))
    expect(await screen.findAllByText('Accepted')).toHaveLength(3)
    await waitFor(() => expect(screen.queryByText('Atualizando seu progresso...')).not.toBeInTheDocument())
    expect(screen.getByText('Teste oculto 2')).toBeInTheDocument()
    expect(screen.queryByText('HIDDEN_INPUT')).not.toBeInTheDocument()
    expect(screen.queryByText('HIDDEN_EXPECTED')).not.toBeInTheDocument()
    expect(screen.queryByText('HIDDEN_ACTUAL')).not.toBeInTheDocument()
    expect(screen.queryByText('HIDDEN_ERROR')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([request]) => String(request) === '/api/problems')).toHaveLength(2)
    expect(fetchMock.mock.calls.filter(([request]) => String(request) === '/api/problems/two-sum-001')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Fechar exercício' }))
    await user.click(screen.getByRole('button', { name: 'Dashboard' }))
    await waitFor(() => expect(screen.getByText('Exercícios resolvidos').parentElement?.parentElement).toHaveTextContent('1'))
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(dashboardReads).toBeGreaterThan(1)
  })

  it('shows a request error and prevents an empty-code request', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) return response([summary])
      if (url === '/api/problems/two-sum-001' && !init?.method) return response(details)
      return new Response(JSON.stringify({ code: 'RUNNER_UNAVAILABLE', message: 'Java Runner indisponível.', errors: [] }), { status: 500 })
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    const editor = await screen.findByRole('textbox', { name: 'Editor de solução' })
    await user.clear(editor)
    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Digite uma solução')
    expect(fetchMock.mock.calls.filter(([, requestInit]) => requestInit?.method === 'POST')).toHaveLength(0)
    await fireEvent.change(editor, { target: { value: 'class Solution {}' } })
    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Java Runner indisponível.')
  })

  it('prevents concurrent executions and exposes the pending action', async () => {
    const user = userEvent.setup()
    let resolveRun!: (value: Response) => void
    const pendingRun = new Promise<Response>((resolve) => { resolveRun = resolve })
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) return response([summary])
      if (url === '/api/problems/two-sum-001' && !init?.method) return response(details)
      if (url === '/api/problems/two-sum-001/run' && init?.method === 'POST') return pendingRun
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    await screen.findByRole('button', { name: 'Run' })

    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(await screen.findByRole('button', { name: 'Executando...' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled()
    expect(fetchMock.mock.calls.filter(([, requestInit]) => requestInit?.method === 'POST')).toHaveLength(1)

    resolveRun(response(wrongRun))
    expect(await screen.findAllByText('Wrong Answer')).toHaveLength(2)
  })

  it('refreshes progress after a non-accepted Submit', async () => {
    const user = userEvent.setup()
    const attemptedSummary = { ...summary, progress: { ...summary.progress, status: 'ATTEMPTED' as const, attempts: 1 } }
    const attemptedDetails = { ...details, progress: attemptedSummary.progress }
    let catalogReads = 0
    let detailReads = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) return response(++catalogReads === 1 ? [summary] : [attemptedSummary])
      if (url === '/api/problems/two-sum-001' && !init?.method) return response(++detailReads === 1 ? details : attemptedDetails)
      if (url === '/api/problems/two-sum-001/submit' && init?.method === 'POST') return response(wrongRun)
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    await user.click(await screen.findByRole('button', { name: 'Submit' }))

    expect(await screen.findAllByText('Wrong Answer')).toHaveLength(2)
    await waitFor(() => {
      expect(catalogReads).toBe(2)
      expect(detailReads).toBe(2)
    })
    expect(fetchMock.mock.calls.filter(([request, requestInit]) => String(request).endsWith('/submit') && requestInit?.method === 'POST')).toHaveLength(1)
  })

  it('keeps the Judge result when post-submit progress refresh fails', async () => {
    const user = userEvent.setup()
    let catalogReads = 0
    let detailReads = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) {
        catalogReads += 1
        if (catalogReads === 1) return response([summary])
        throw new Error('catalog offline')
      }
      if (url === '/api/problems/two-sum-001' && !init?.method) {
        detailReads += 1
        if (detailReads === 1) return response(details)
        throw new Error('details offline')
      }
      if (url === '/api/problems/two-sum-001/submit' && init?.method === 'POST') return response(acceptedSubmit)
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    await user.click(await screen.findByRole('button', { name: 'Submit' }))

    expect(await screen.findAllByText('Accepted')).toHaveLength(3)
    expect(await screen.findByRole('alert')).toHaveTextContent('Submissão concluída, mas não foi possível recarregar todo o progresso.')
    expect(fetchMock.mock.calls.filter(([request, requestInit]) => String(request).endsWith('/submit') && requestInit?.method === 'POST')).toHaveLength(1)
  })

  it('persists favorite and review toggles and keeps review independent from status', async () => {
    const user = userEvent.setup()
    let dashboardReads = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(++dashboardReads === 1 ? dashboard : { ...dashboard, summary: { ...dashboard.summary, favoriteProblems: 1, reviewProblems: 1 } })
      if (url === '/api/problems' && !init?.method) return response([summary])
      if (url === '/api/problems/two-sum-001' && !init?.method) return response(details)
      if (url.startsWith('/api/submissions?') && !init?.method) return response({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 })
      if (url === '/api/problems/two-sum-001/progress' && init?.method === 'PATCH') {
        const change = JSON.parse(String(init.body)) as Partial<ProblemSummary['progress']>
        return response({ ...summary.progress, ...change })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Adicionar aos favoritos' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([input, requestInit]) => String(input).endsWith('/progress') && requestInit?.method === 'PATCH' && requestInit.body === JSON.stringify({ favorite: true }))).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Marcar para revisão' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover da revisão' })).toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([input, requestInit]) => String(input).endsWith('/progress') && requestInit?.method === 'PATCH' && requestInit.body === JSON.stringify({ reviewRequired: true }))).toBe(true)
    expect(screen.getByText('Não iniciado')).toBeInTheDocument()
    expect(dashboardReads).toBeGreaterThanOrEqual(3)
  })

  it('blocks duplicate progress mutations while saving and preserves state after a failure', async () => {
    const user = userEvent.setup()
    let resolvePatch!: (value: Response) => void
    let rejectPatch = false
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) return response([summary])
      if (url === '/api/problems/two-sum-001/progress' && init?.method === 'PATCH') {
        if (rejectPatch) return new Response(JSON.stringify({ code: 'INVALID_PROGRESS_UPDATE', message: 'Progresso indisponível.', errors: [] }), { status: 400 })
        return new Promise<Response>((resolve) => { resolvePatch = resolve })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    const favorite = screen.getByRole('button', { name: 'Adicionar aos favoritos' })
    await user.click(favorite)
    expect(favorite).toBeDisabled()
    resolvePatch(response({ ...summary.progress, favorite: true }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).not.toBeDisabled())

    rejectPatch = true
    await user.click(screen.getByRole('button', { name: 'Remover dos favoritos' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Progresso indisponível.')
    expect(screen.getByRole('button', { name: 'Remover dos favoritos' })).toBeInTheDocument()
    expect(fetchMock.mock.calls.filter(([request, requestInit]) => String(request).endsWith('/progress') && requestInit?.method === 'PATCH')).toHaveLength(2)
  })

  it('applies pessimistic progress updates in the open exercise editor', async () => {
    const user = userEvent.setup()
    let resolvePatch!: (value: Response) => void
    let failPatch = false
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url === '/api/dashboard' && !init?.method) return response(dashboard)
      if (url === '/api/problems' && !init?.method) return response([summary])
      if (url === '/api/problems/two-sum-001' && !init?.method) return response(details)
      if (url.startsWith('/api/submissions?') && !init?.method) return response({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 })
      if (url === '/api/problems/two-sum-001/progress' && init?.method === 'PATCH') {
        if (failPatch) return new Response(JSON.stringify({ code: 'INVALID_PROGRESS_UPDATE', message: 'Editor offline.', errors: [] }), { status: 400 })
        return new Promise<Response>((resolve) => { resolvePatch = resolve })
      }
      throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
    })

    render(<App />)
    await screen.findByText('Seu espaço de estudos.')
    await user.click(screen.getByRole('button', { name: 'Exercícios' }))
    await user.click(screen.getByRole('button', { name: 'Two Sum' }))
    await user.click((await screen.findAllByRole('button', { name: 'Histórico' })).at(-1)!)
    expect(await screen.findByText('Submissões anteriores deste exercício')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar histórico' }))
    const review = await screen.findByRole('button', { name: 'Revisar' })
    await user.click(review)
    expect(review).toBeDisabled()
    resolvePatch(response({ ...summary.progress, reviewRequired: true }))
    const markedReview = await screen.findByRole('button', { name: 'Revisão marcada' })
    expect(markedReview).not.toBeDisabled()

    failPatch = true
    await user.click(markedReview)
    expect(await screen.findByRole('status')).toHaveTextContent('Editor offline.')
    expect(screen.getByRole('button', { name: 'Revisão marcada' })).toBeInTheDocument()
  })
})
