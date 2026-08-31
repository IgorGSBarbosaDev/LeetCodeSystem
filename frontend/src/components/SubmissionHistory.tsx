import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock3, Code2, X } from 'lucide-react'

import { ApiRequestError, fetchSubmission, fetchSubmissions } from '../lib/api'
import type { JudgeStatus, ProblemSummary, SubmissionDetail, SubmissionPage, SubmissionSummary } from '../types'

const statusLabels: Record<JudgeStatus, string> = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
}

function errorMessage(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : error instanceof Error ? error.message : 'Não foi possível carregar o histórico.'
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatExecutionTime(value: number): string {
  return `${value} ms`
}

export default function SubmissionHistoryView({ problems }: { problems: ProblemSummary[] }) {
  return <SubmissionHistoryContent problems={problems} />
}

export function SubmissionHistoryPanel({ problemId, onClose }: { problemId: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-labelledby="submission-history-title"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 id="submission-history-title" className="font-semibold">Histórico do exercício</h2><p className="mt-1 text-sm text-muted-foreground">Submissões anteriores deste exercício</p></div><button onClick={onClose} aria-label="Fechar histórico" className="rounded-md p-1 hover:bg-muted"><X className="size-5" /></button></div><div className="max-h-[calc(85vh-88px)] overflow-y-auto p-5"><SubmissionHistoryContent problems={[]} fixedProblemId={problemId} compact /></div></div></div>
}

function SubmissionHistoryContent({ problems, fixedProblemId, compact = false }: { problems: ProblemSummary[]; fixedProblemId?: string; compact?: boolean }) {
  const [status, setStatus] = useState('')
  const [problemId, setProblemId] = useState(fixedProblemId ?? '')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<SubmissionPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<SubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    setPage(0)
  }, [status, problemId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchSubmissions({ page, size: 20, problemId: problemId || undefined, status: status || undefined })
      .then((result) => { if (!cancelled) setData(result) })
      .catch((reason) => { if (!cancelled) setError(errorMessage(reason)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [page, problemId, status])

  const openDetail = async (submission: SubmissionSummary) => {
    setDetailLoading(true)
    setError(null)
    try {
      setSelected(await fetchSubmission(submission.id))
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setDetailLoading(false)
    }
  }

  return <div className="flex flex-col gap-5">
    {!compact && <div><h1 className="text-3xl font-semibold tracking-tight">Histórico</h1><p className="mt-2 text-muted-foreground">Consulte resultados e soluções enviadas anteriormente.</p></div>}
    {!fixedProblemId && <div className="flex flex-col gap-3 md:flex-row"><select value={problemId} onChange={(event) => setProblemId(event.target.value)} aria-label="Filtrar histórico por exercício" className="h-10 flex-1 rounded-lg border border-input bg-card px-3 text-sm"><option value="">Todos os exercícios</option>{problems.map((problem) => <option key={problem.id} value={problem.id}>{problem.title}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar histórico por resultado" className="h-10 rounded-lg border border-input bg-card px-3 text-sm"><option value="">Todos os resultados</option>{(Object.keys(statusLabels) as JudgeStatus[]).map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></div>}
    {loading ? <div className="flex min-h-40 items-center justify-center text-sm text-muted-foreground" role="status">Carregando histórico...</div> : error && !data ? <div className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive" role="alert">{error}</div> : data && data.items.length === 0 ? <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhuma submissão encontrada.</div> : data && <>
      <div className="overflow-hidden rounded-xl border border-border"><div className="hidden grid-cols-[1.5fr_150px_90px_80px_130px] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid"><span>Exercício</span><span>Resultado</span><span>Testes</span><span>Tempo</span><span>Data</span></div>{data.items.map((submission) => <SubmissionRow key={submission.id} submission={submission} onOpen={() => void openDetail(submission)} />)}</div>
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground"><span>{data.totalItems} submissão{data.totalItems === 1 ? '' : 'ões'} · página {data.page + 1} de {Math.max(data.totalPages, 1)}</span><div className="flex gap-2"><button disabled={data.page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))} aria-label="Página anterior" className="rounded-md border border-border p-2 hover:bg-muted disabled:opacity-40"><ChevronLeft className="size-4" /></button><button disabled={data.page + 1 >= data.totalPages} onClick={() => setPage((current) => current + 1)} aria-label="Próxima página" className="rounded-md border border-border p-2 hover:bg-muted disabled:opacity-40"><ChevronRight className="size-4" /></button></div></div>
    </>}
    {error && data && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {detailLoading && <div className="text-sm text-muted-foreground" role="status">Carregando solução...</div>}
    {selected && <SubmissionDetailModal submission={selected} onClose={() => setSelected(null)} />}
  </div>
}

function SubmissionRow({ submission, onOpen }: { submission: SubmissionSummary; onOpen: () => void }) {
  return <button onClick={onOpen} className="grid w-full grid-cols-1 gap-2 border-b border-border px-4 py-4 text-left last:border-0 hover:bg-muted/40 sm:grid-cols-[1.5fr_150px_90px_80px_130px] sm:items-center sm:gap-4"><span className="flex min-w-0 items-center gap-2"><Code2 className="size-4 shrink-0 text-muted-foreground" /><span className="truncate text-sm font-medium">{submission.problemTitle}</span></span><span className={`text-xs font-medium ${submission.status === 'ACCEPTED' ? 'text-primary' : 'text-destructive'}`}>{statusLabels[submission.status]}</span><span className="text-xs text-muted-foreground">{submission.testsPassed} / {submission.totalTests}</span><span className="text-xs text-muted-foreground">{formatExecutionTime(submission.executionTimeMs)}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3" />{formatDate(submission.submittedAt)}</span></button>
}

function SubmissionDetailModal({ submission, onClose }: { submission: SubmissionDetail; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-labelledby="submission-detail-title"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 id="submission-detail-title" className="font-semibold">{submission.problemTitle}</h2><p className="mt-1 text-sm text-muted-foreground">{statusLabels[submission.status]} · {submission.testsPassed} / {submission.totalTests} testes · {formatExecutionTime(submission.executionTimeMs)} · {formatDate(submission.submittedAt)}</p></div><button onClick={onClose} aria-label="Fechar solução" className="rounded-md p-1 hover:bg-muted"><X className="size-5" /></button></div><pre className="min-h-64 overflow-auto bg-[#1e1e1e] p-5 font-mono text-sm leading-6 text-[#d4d4d4]"><code>{submission.code}</code></pre></div></div>
}
