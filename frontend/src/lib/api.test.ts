import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchDashboard, fetchProblem, fetchSubmission, fetchSubmissions, runProblem, submitProblem, updateProblemProgress } from './api'

afterEach(() => vi.restoreAllMocks())

const result = {
  status: 'ACCEPTED',
  testsPassed: 1,
  totalTests: 1,
  executionTimeMs: 12,
  testResults: [],
}

describe('judge API', () => {
  it.each([
    ['runProblem', runProblem, '/api/problems/two%20sum/run'],
    ['submitProblem', submitProblem, '/api/problems/two%20sum/submit'],
  ] as const)('%s sends the code to the corresponding endpoint', async (_name, execute, url) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

    await execute('two sum', 'class Solution {}')

    expect(fetchMock).toHaveBeenCalledWith(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'class Solution {}' }),
    })
  })

  it('preserves structured API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'RUNNER_UNAVAILABLE', message: 'Java indisponível.', errors: [] }), { status: 500 }),
    )

    await expect(runProblem('problem-1', 'code')).rejects.toMatchObject({
      status: 500,
      code: 'RUNNER_UNAVAILABLE',
      message: 'Java indisponível.',
    })
  })

  it('normalizes the backend starter code for the editor', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({
        id: 'problem-1',
        title: 'Two Sum',
        difficulty: 'EASY',
        categories: [],
        description: '',
        constraints: [],
        examples: [],
        method: { name: 'twoSum', returnType: 'int[]', parameters: [] },
        starterCode: 'class Solution {}',
        testCases: [],
        hiddenTestCaseCount: 0,
        progress: { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
      }), { status: 200 }),
    )

    await expect(fetchProblem('problem-1')).resolves.toMatchObject({ starterCode: { java: 'class Solution {}' } })
  })
})

describe('progress, history and dashboard API', () => {
  it('sends a partial progress patch', async () => {
    const progress = { status: 'SOLVED', attempts: 1, favorite: true, reviewRequired: false }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(progress), { status: 200 }))

    await expect(updateProblemProgress('two sum', { favorite: true })).resolves.toEqual(progress)
    expect(fetchMock).toHaveBeenCalledWith('/api/problems/two%20sum/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ favorite: true }),
    })
  })

  it('serializes history filters and exposes dashboard/detail readers', async () => {
    const page = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 }
    const detail = { id: 'submission-1', problemId: 'problem-1', problemTitle: 'Two Sum', status: 'ACCEPTED', testsPassed: 1, totalTests: 1, executionTimeMs: 12, submittedAt: '2026-08-30T10:00:00Z', code: 'class Solution {}' }
    const dashboard = { summary: { totalProblems: 0, solvedProblems: 0, remainingProblems: 0, attemptedProblems: 0, completionPercentage: 0, favoriteProblems: 0, reviewProblems: 0 }, byDifficulty: [], byCategory: [], recentSubmissions: [] }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.startsWith('/api/submissions?')) return new Response(JSON.stringify(page), { status: 200 })
      if (url === '/api/submissions/submission-1') return new Response(JSON.stringify(detail), { status: 200 })
      return new Response(JSON.stringify(dashboard), { status: 200 })
    })

    await fetchSubmissions({ page: 2, size: 10, problemId: 'two sum', status: 'ACCEPTED' })
    await fetchSubmission('submission-1')
    await fetchDashboard()

    expect(fetchMock.mock.calls[0][0]).toBe('/api/submissions?page=2&size=10&problemId=two+sum&status=ACCEPTED')
    expect(fetchMock.mock.calls[1][0]).toBe('/api/submissions/submission-1')
    expect(fetchMock.mock.calls[2][0]).toBe('/api/dashboard')
  })
})
