import {
  AlertCircle,
  CheckCircle2,
  CircleX,
  Clock3,
  EyeOff,
  FileWarning,
  LoaderCircle,
  PlayCircle,
  TimerOff,
} from 'lucide-react'

import type { CodeExecutionResult, JudgeStatus, JsonValue } from '../types'

type ExecutionResultPanelProps = {
  action: 'Run' | 'Submit'
  result: CodeExecutionResult | null
  pending: boolean
  error: string | null
  syncing: boolean
  syncError?: string | null
}

const statusLabels: Record<JudgeStatus, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
}

const statusClasses: Record<JudgeStatus, string> = {
  ACCEPTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  WRONG_ANSWER: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  COMPILATION_ERROR: 'border-destructive/40 bg-destructive/10 text-destructive',
  RUNTIME_ERROR: 'border-destructive/40 bg-destructive/10 text-destructive',
  TIME_LIMIT_EXCEEDED: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
}

function formatValue(value: JsonValue | undefined): string {
  if (value === undefined) return '—'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

function StatusIcon({ status }: { status: JudgeStatus }) {
  if (status === 'ACCEPTED') return <CheckCircle2 className="size-4" aria-hidden="true" />
  if (status === 'TIME_LIMIT_EXCEEDED') return <TimerOff className="size-4" aria-hidden="true" />
  if (status === 'COMPILATION_ERROR') return <FileWarning className="size-4" aria-hidden="true" />
  if (status === 'RUNTIME_ERROR') return <CircleX className="size-4" aria-hidden="true" />
  return <AlertCircle className="size-4" aria-hidden="true" />
}

function ResultBlock({ label, value }: { label: string; value: JsonValue | undefined }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-muted/40 p-3 text-xs leading-5 text-foreground">{formatValue(value)}</pre>
    </div>
  )
}

function TestResult({ test }: { test: CodeExecutionResult['testResults'][number] }) {
  const label = test.hidden ? `Teste oculto ${test.index + 1}` : `Teste ${test.index + 1}`

  return (
    <article className="rounded-lg border border-border bg-background p-3" data-testid={`test-result-${test.index}`}>
      <div className="flex flex-wrap items-center gap-2">
        {test.hidden && <EyeOff className="size-4 text-muted-foreground" aria-hidden="true" />}
        <h3 className="text-sm font-medium">{label}</h3>
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${statusClasses[test.status]}`}>
          <StatusIcon status={test.status} />
          {statusLabels[test.status]}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock3 className="size-3" aria-hidden="true" />
          {test.executionTimeMs} ms
        </span>
      </div>

      {!test.hidden && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <ResultBlock label="Input" value={test.input} />
          <ResultBlock label="Output esperado" value={test.expectedOutput} />
          <ResultBlock label="Output recebido" value={test.actualOutput} />
        </div>
      )}

      {!test.hidden && test.error && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          <p className="mb-1 font-semibold">Erro do teste</p>
          <pre className="whitespace-pre-wrap break-words">{test.error}</pre>
        </div>
      )}
    </article>
  )
}

export default function ExecutionResultPanel({ action, result, pending, error, syncing, syncError }: ExecutionResultPanelProps) {
  return (
    <div className="border-t border-border bg-muted/30 p-4" aria-live="polite">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado</span>
        {result && <span className="text-xs text-muted-foreground">{action}</span>}
      </div>

      {pending && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {action === 'Run' ? 'Executando testes públicos...' : 'Enviando solução para todos os testes...'}
        </div>
      )}

      {error && !pending && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {!pending && !error && !result && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
          <PlayCircle className="size-4" aria-hidden="true" />
          Execute Run para validar os casos públicos ou Submit para avaliar a solução completa.
        </div>
      )}

      {!pending && !error && result && (
        <>
          <div className={`flex flex-wrap items-center gap-3 rounded-lg border p-4 ${statusClasses[result.status]}`} role="status">
            <StatusIcon status={result.status} />
            <span className="font-semibold">{statusLabels[result.status]}</span>
            <span className="text-sm">{result.testsPassed} / {result.totalTests} testes aprovados</span>
            <span className="ml-auto inline-flex items-center gap-1 text-xs"><Clock3 className="size-3" aria-hidden="true" />{result.executionTimeMs} ms</span>
          </div>

          {syncing && <p className="mt-2 text-xs text-muted-foreground" role="status">Atualizando seu progresso...</p>}

          {syncError && <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200" role="alert">{syncError}</p>}

          {result.compilationError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="mb-2 font-semibold">Erro de compilação</p>
              <pre className="whitespace-pre-wrap break-words text-xs leading-5">{result.compilationError}</pre>
            </div>
          )}

          {result.runtimeError && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <p className="mb-2 font-semibold">Erro de execução</p>
              <pre className="whitespace-pre-wrap break-words text-xs leading-5">{result.runtimeError}</pre>
            </div>
          )}

          {result.testResults.length > 0 && (
            <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
              {result.testResults.map((test) => <TestResult key={`${test.index}-${test.status}`} test={test} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}
