import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import type { CodeExecutionResult } from '../types'
import ExecutionResultPanel from './ExecutionResultPanel'

const baseResult: CodeExecutionResult = {
  status: 'WRONG_ANSWER',
  testsPassed: 1,
  totalTests: 2,
  executionTimeMs: 37,
  testResults: [
    {
      index: 0,
      hidden: false,
      status: 'ACCEPTED',
      input: { value: 1 },
      expectedOutput: 1,
      actualOutput: 1,
      executionTimeMs: 4,
    },
    {
      index: 1,
      hidden: true,
      status: 'WRONG_ANSWER',
      input: { value: 'SEGREDO' },
      expectedOutput: 'OUTPUT_SECRETO',
      actualOutput: 'RECEBIDO_SECRETO',
      executionTimeMs: 8,
      error: 'ERRO_SECRETO',
    },
  ],
}

describe('ExecutionResultPanel', () => {
  it('renders the summary and public test details', async () => {
    const user = userEvent.setup()
    render(<ExecutionResultPanel action="Run" result={baseResult} pending={false} error={null} syncing={false} />)

    expect(screen.getAllByText('Wrong Answer')).toHaveLength(2)
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('1 / 2 testes aprovados')

    expect(screen.getByTestId('test-result-0')).not.toHaveTextContent(/"value": 1/)
    await user.click(screen.getByRole('button', { name: 'Alternar detalhes de Teste 1' }))
    expect(await screen.findByText(/"value": 1/)).toBeInTheDocument()
    expect(screen.getByText(/Saída esperada/i)).toBeInTheDocument()
  })

  it('opens failed public tests and keeps passing tests compact', async () => {
    const user = userEvent.setup()
    const result: CodeExecutionResult = {
      ...baseResult,
      testResults: [
        {
          index: 0,
          hidden: false,
          status: 'WRONG_ANSWER',
          input: { value: 1 },
          expectedOutput: 2,
          actualOutput: 1,
          executionTimeMs: 4,
        },
        {
          index: 1,
          hidden: false,
          status: 'ACCEPTED',
          input: { value: 2 },
          expectedOutput: 3,
          actualOutput: 3,
          executionTimeMs: 5,
        },
      ],
    }

    render(<ExecutionResultPanel action="Run" result={result} pending={false} error={null} syncing={false} />)

    expect(screen.getByTestId('test-result-0')).toHaveTextContent(/"value": 1/)
    expect(screen.getByTestId('test-result-1')).not.toHaveTextContent(/"value": 2/)

    await user.click(screen.getByRole('button', { name: 'Alternar detalhes de Teste 2' }))
    expect(screen.getByTestId('test-result-1')).toHaveTextContent(/"value": 2/)
  })

  it('does not render hidden test data', () => {
    render(<ExecutionResultPanel action="Submit" result={baseResult} pending={false} error={null} syncing={false} />)

    const hiddenTest = screen.getByTestId('test-result-1')
    expect(hiddenTest).toHaveTextContent('Teste oculto 2')
    expect(hiddenTest).toHaveTextContent('Wrong Answer')
    expect(hiddenTest).toHaveTextContent('8 ms')
    expect(within(hiddenTest).queryByRole('button')).not.toBeInTheDocument()
    expect(hiddenTest).not.toHaveTextContent('SEGREDO')
    expect(hiddenTest).not.toHaveTextContent('OUTPUT_SECRETO')
    expect(hiddenTest).not.toHaveTextContent('RECEBIDO_SECRETO')
    expect(hiddenTest).not.toHaveTextContent('ERRO_SECRETO')
  })

  it.each([
    ['COMPILATION_ERROR', 'Compilation Error', 'javac falhou'],
    ['RUNTIME_ERROR', 'Runtime Error', 'exceção'],
    ['TIME_LIMIT_EXCEEDED', 'Time Limit Exceeded', 'tempo'],
  ] as const)('renders %s and global errors', (status, label, message) => {
    const result: CodeExecutionResult = {
      status,
      testsPassed: 0,
      totalTests: 1,
      executionTimeMs: 10,
      testResults: [],
      ...(status === 'COMPILATION_ERROR' ? { compilationError: message } : status === 'RUNTIME_ERROR' ? { runtimeError: message } : {}),
    }

    render(<ExecutionResultPanel action="Submit" result={result} pending={false} error={null} syncing={false} />)

    expect(screen.getByRole('status')).toHaveTextContent(label)
    if (status !== 'TIME_LIMIT_EXCEEDED') expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('shows loading and request failures', () => {
    const { rerender } = render(<ExecutionResultPanel action="Run" result={null} pending error={null} syncing={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('Executando testes públicos')

    rerender(<ExecutionResultPanel action="Run" result={null} pending={false} error="Runner indisponível." syncing={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Runner indisponível.')
  })

  it('announces background progress synchronization without hiding the verdict', () => {
    render(<ExecutionResultPanel action="Submit" result={{ ...baseResult, status: 'ACCEPTED', testsPassed: 2 }} pending={false} error={null} syncing />)
    expect(screen.getAllByText('Accepted')).toHaveLength(2)
    expect(screen.getByText('Atualizando seu progresso...')).toBeInTheDocument()
    expect(within(screen.getByTestId('test-result-1')).queryByText(/SEGREDO/)).not.toBeInTheDocument()
  })
})
