import { afterEach, describe, expect, it, vi } from 'vitest'

import { fetchProblem, runProblem, submitProblem } from './api'

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
