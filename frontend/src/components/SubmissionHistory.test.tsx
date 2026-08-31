import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SubmissionHistoryView, { SubmissionHistoryPanel } from './SubmissionHistory'
import type { ProblemSummary } from '../types'

const problem: ProblemSummary = {
  id: 'problem-1', title: 'Two Sum', difficulty: 'EASY', categories: ['ARRAY'],
  progress: { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
}

const firstPage = {
  items: [{ id: 'submission-1', problemId: 'problem-1', problemTitle: 'Two Sum', status: 'ACCEPTED', testsPassed: 2, totalTests: 2, executionTimeMs: 12, submittedAt: '2026-08-30T10:00:00Z' }],
  page: 0, size: 20, totalItems: 21, totalPages: 2,
}

afterEach(() => vi.restoreAllMocks())

describe('SubmissionHistoryView', () => {
  it('loads filters, opens a read-only previous solution and paginates', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url === '/api/submissions/submission-1') return new Response(JSON.stringify({ ...firstPage.items[0], code: 'class Solution {}' }), { status: 200 })
      const page = url.includes('page=1') ? { ...firstPage, page: 1, totalItems: 21, items: [] } : firstPage
      return new Response(JSON.stringify(page), { status: 200 })
    })

    render(<SubmissionHistoryView problems={[problem]} />)
    expect(await screen.findByText('Histórico')).toBeInTheDocument()
    expect((await screen.findAllByText('Two Sum')).length).toBeGreaterThan(0)
    expect(screen.getByText('12 ms')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: /Two Sum/i })[0])
    expect(await screen.findByText('class Solution {}')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fechar solução' }))
    await user.click(screen.getByRole('button', { name: 'Próxima página' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('page=1'))).toBe(true))
    expect(screen.getByText('Nenhuma submissão encontrada.')).toBeInTheDocument()
  })

  it('renders an API error and an empty result state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ code: 'API_ERROR', message: 'Histórico indisponível.' }), { status: 500 }))
    render(<SubmissionHistoryView problems={[]} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Histórico indisponível.')

    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 }), { status: 200 }))
    render(<SubmissionHistoryView problems={[]} />)
    expect(await screen.findByText('Nenhuma submissão encontrada.')).toBeInTheDocument()
  })

  it('loads the exercise-scoped history through the same filtered endpoint', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.startsWith('/api/submissions?')) {
        expect(url).toContain('problemId=problem-1')
        return new Response(JSON.stringify(firstPage), { status: 200 })
      }
      return new Response(JSON.stringify({ ...firstPage.items[0], code: 'class Solution {}' }), { status: 200 })
    })

    render(<SubmissionHistoryPanel problemId="problem-1" onClose={onClose} />)
    expect(await screen.findByText('Submissões anteriores deste exercício')).toBeInTheDocument()
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => String(input).includes('problemId=problem-1'))).toBe(true))
    await userEvent.setup().click(screen.getByRole('button', { name: /Two Sum/i }))
    expect(await screen.findByText('class Solution {}')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar histórico' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
