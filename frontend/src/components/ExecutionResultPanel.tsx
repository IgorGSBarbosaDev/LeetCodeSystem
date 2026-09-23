import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  CircleX,
  Clock3,
  EyeOff,
  FileWarning,
  LoaderCircle,
  PlayCircle,
  TimerOff,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Separator } from './ui/separator'
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

const statusDescriptions: Record<JudgeStatus, string> = {
  ACCEPTED: 'A solução passou por todos os casos avaliados.',
  WRONG_ANSWER: 'Pelo menos um caso retornou um valor diferente do esperado.',
  COMPILATION_ERROR: 'O código não pôde ser compilado.',
  RUNTIME_ERROR: 'A solução falhou durante a execução.',
  TIME_LIMIT_EXCEEDED: 'A solução ultrapassou o tempo máximo permitido.',
}

const statusClasses: Record<JudgeStatus, string> = {
  ACCEPTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  WRONG_ANSWER: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  COMPILATION_ERROR: 'border-destructive/40 bg-destructive/10 text-destructive',
  RUNTIME_ERROR: 'border-destructive/40 bg-destructive/10 text-destructive',
  TIME_LIMIT_EXCEEDED: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
}

const statusSummaryClasses: Record<JudgeStatus, string> = {
  ACCEPTED: 'border-emerald-500/30 bg-emerald-500/[0.06]',
  WRONG_ANSWER: 'border-amber-500/30 bg-amber-500/[0.06]',
  COMPILATION_ERROR: 'border-destructive/30 bg-destructive/[0.05]',
  RUNTIME_ERROR: 'border-destructive/30 bg-destructive/[0.05]',
  TIME_LIMIT_EXCEEDED: 'border-orange-500/30 bg-orange-500/[0.06]',
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
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <pre className="min-h-20 whitespace-pre-wrap break-words rounded-lg border border-border/80 bg-muted/35 p-3 font-mono text-xs leading-5 text-foreground">{formatValue(value)}</pre>
    </div>
  )
}

function TestResultHeader({ test, open, onToggle }: { test: CodeExecutionResult['testResults'][number]; open: boolean; onToggle?: () => void }) {
  const label = test.hidden ? `Teste oculto ${test.index + 1}` : `Teste ${test.index + 1}`
  const content = (
    <>
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${statusClasses[test.status]}`}>
        <StatusIcon status={test.status} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {test.hidden && <span className="mt-0.5 block text-xs text-muted-foreground">Resultado resumido para preservar o caso oculto</span>}
      </span>
      <Badge variant="outline" className={`hidden shrink-0 sm:inline-flex ${statusClasses[test.status]}`}>
        {statusLabels[test.status]}
      </Badge>
      {test.hidden && (
        <Badge variant="secondary" className="hidden shrink-0 items-center gap-1 sm:inline-flex">
          <EyeOff className="size-3" aria-hidden="true" /> Oculto
        </Badge>
      )}
      <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-muted-foreground">
        <Clock3 className="size-3.5" aria-hidden="true" />
        {test.executionTimeMs} ms
      </span>
      {onToggle && <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />}
    </>
  )

  if (!onToggle) return <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">{content}</div>

  return (
    <button
      type="button"
      className="group flex min-h-14 w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      aria-label={`Alternar detalhes de ${label}`}
      aria-expanded={open}
      onClick={onToggle}
    >
      {content}
    </button>
  )
}

function TestResult({ test }: { test: CodeExecutionResult['testResults'][number] }) {
  const canShowDetails = !test.hidden
  const [open, setOpen] = useState(canShowDetails && test.status !== 'ACCEPTED')

  if (!canShowDetails) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs" data-testid={`test-result-${test.index}`}>
        <TestResultHeader test={test} open={false} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xs" data-testid={`test-result-${test.index}`}>
      <TestResultHeader test={test} open={open} onToggle={() => setOpen((value) => !value)} />
      {open && (
        <div className="border-t border-border px-4 py-4">
          <div className="@container">
            <div className="grid gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
              <ResultBlock label="Entrada" value={test.input} />
              <ResultBlock label="Saída esperada" value={test.expectedOutput} />
              <ResultBlock label="Saída recebida" value={test.actualOutput} />
            </div>
          </div>

          {test.error && (
            <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              <p className="mb-1 font-semibold">Erro neste teste</p>
              <pre className="whitespace-pre-wrap break-words font-mono leading-5">{test.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function GlobalError({ label, message }: { label: string; message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/[0.04] shadow-none" role="alert">
      <CardHeader className="gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          {label}
        </CardTitle>
        <span className="text-xs text-destructive/80">Corrija o código e tente novamente</span>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-destructive/20 bg-background/70 p-3 font-mono text-xs leading-5 text-destructive">{message}</pre>
      </CardContent>
    </Card>
  )
}

function ResultSummary({ action, result }: { action: 'Run' | 'Submit'; result: CodeExecutionResult }) {
  const progress = result.totalTests === 0 ? 0 : Math.round((result.testsPassed / result.totalTests) * 100)

  return (
    <Card className={`shrink-0 shadow-none ${statusSummaryClasses[result.status]}`} role="status">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${statusClasses[result.status]}`}>
            <StatusIcon status={result.status} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">{statusLabels[result.status]}</h2>
              <Badge variant="outline" className={statusClasses[result.status]}>{action}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{statusDescriptions[result.status]}</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="font-mono text-sm font-medium tabular-nums">{result.testsPassed} / {result.totalTests} testes aprovados</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" aria-hidden="true" />{result.executionTimeMs} ms</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Progresso da validação</span>
            <span className="font-mono tabular-nums">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10" role="progressbar" aria-label="Progresso da validação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className={`h-full rounded-full transition-all ${result.status === 'ACCEPTED' ? 'bg-emerald-500' : result.status === 'WRONG_ANSWER' ? 'bg-amber-500' : 'bg-destructive'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ExecutionResultPanel({ action, result, pending, error, syncing, syncError }: ExecutionResultPanelProps) {
  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-muted/25"
      aria-live="polite"
      aria-label="Painel de resultados"
      data-testid="execution-results-scroll"
      tabIndex={0}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Resultado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{action === 'Run' ? 'Casos públicos' : 'Avaliação completa'}</p>
        </div>
        {result && <span className="text-xs text-muted-foreground">{result.testResults.length} {result.testResults.length === 1 ? 'caso exibido' : 'casos exibidos'}</span>}
      </div>

      {pending && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">{action === 'Run' ? 'Executando testes públicos' : 'Avaliando a solução'}</p>
            <p className="mt-0.5 text-xs">Isso pode levar alguns segundos.</p>
          </div>
        </div>
      )}

      {error && !pending && (
        <div className="mx-4 mb-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-4 text-sm text-destructive" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium">Não foi possível validar a solução</p>
            <p className="mt-1 text-xs leading-5">{error}</p>
          </div>
        </div>
      )}

      {!pending && !error && !result && (
        <div className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
          <PlayCircle className="size-4 shrink-0" aria-hidden="true" />
          Execute Run para validar os casos públicos ou Submit para avaliar a solução completa.
        </div>
      )}

      {!pending && !error && result && (
        <div className="flex shrink-0 flex-col gap-3 px-4 pb-4">
          <ResultSummary action={action} result={result} />

          {syncing && <p className="shrink-0 text-xs text-muted-foreground" role="status">Atualizando seu progresso...</p>}
          {syncError && <p className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200" role="alert">{syncError}</p>}

          {result.compilationError && <GlobalError label="Erro de compilação" message={result.compilationError} />}
          {result.runtimeError && <GlobalError label="Erro de execução" message={result.runtimeError} />}

          {result.testResults.length > 0 && (
            <div className="flex flex-col gap-2 pr-1" data-testid="test-results-list">
              <div className="flex shrink-0 items-center gap-3 px-1 py-1">
                <p className="text-xs font-semibold text-foreground">Casos de teste</p>
                <Separator className="flex-1" />
                <p className="text-xs text-muted-foreground">Abra um caso para ver os detalhes</p>
              </div>
              {result.testResults.map((test) => <TestResult key={`${test.index}-${test.status}`} test={test} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
