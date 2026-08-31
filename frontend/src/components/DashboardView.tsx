import { ArrowUpRight, BarChart3, BookOpen, Clock, Heart } from 'lucide-react'

import type { DashboardResponse, Difficulty, ProblemSummary, SubmissionSummary } from '../types'

const statusLabels = {
  ACCEPTED: 'Accepted',
  WRONG_ANSWER: 'Wrong Answer',
  COMPILATION_ERROR: 'Compilation Error',
  RUNTIME_ERROR: 'Runtime Error',
  TIME_LIMIT_EXCEEDED: 'Time Limit Exceeded',
} as const

const difficultyLabels: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

const categoryLabels: Record<string, string> = {
  ARRAY: 'Array', STRING: 'String', HASH_TABLE: 'Hash Table', TWO_POINTERS: 'Two Pointers',
  SLIDING_WINDOW: 'Sliding Window', STACK: 'Stack', QUEUE: 'Queue', LINKED_LIST: 'Linked List',
  BINARY_SEARCH: 'Binary Search', TREE: 'Tree', BINARY_TREE: 'Binary Tree',
  BINARY_SEARCH_TREE: 'Binary Search Tree', HEAP: 'Heap', GRAPH: 'Graph', BACKTRACKING: 'Backtracking',
  GREEDY: 'Greedy', DYNAMIC_PROGRAMMING: 'Dynamic Programming', RECURSION: 'Recursion',
  SORTING: 'Sorting', MATRIX: 'Matrix', BIT_MANIPULATION: 'Bit Manipulation',
}

function formatCategory(category: string): string {
  return categoryLabels[category] ?? category
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

export default function DashboardView({
  dashboard,
  loading,
  refreshing,
  error,
  onRetry,
  problems,
  onOpenExercises,
  onOpenFavorites,
  onOpenReviews,
  onOpenProblem,
}: {
  dashboard: DashboardResponse | null
  loading: boolean
  refreshing: boolean
  error: string | null
  onRetry: () => void
  problems: ProblemSummary[]
  onOpenExercises: () => void
  onOpenFavorites: () => void
  onOpenReviews: () => void
  onOpenProblem: (problemId: string) => void
}) {
  if (!dashboard && loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Carregando dashboard...</div>
  }

  if (!dashboard && error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center" role="alert">
        <p className="text-sm text-destructive">{error}</p>
        <button onClick={onRetry} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!dashboard) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Aguardando dados do dashboard...</div>
  }

  const { summary } = dashboard
  const nextProblem = problems.find((problem) => problem.progress.status !== 'SOLVED')

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          <span>{error}</span>
          <button onClick={onRetry} className="shrink-0 rounded-md border border-destructive/30 px-3 py-1.5 font-medium hover:bg-destructive/10">
            Tentar novamente
          </button>
        </div>
      )}
      {refreshing && <div className="text-xs text-muted-foreground" role="status">Atualizando dashboard...</div>}
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Prática local de Java</p>
        <h1 className="text-3xl font-semibold tracking-tight">Seu espaço de estudos.</h1>
        <p className="mt-2 text-muted-foreground">Resolva exercícios, acompanhe tentativas e revise seus pontos fracos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Exercícios resolvidos" value={`${summary.solvedProblems}`} detail={`de ${summary.totalProblems}`} />
        <Metric label="Progresso geral" value={`${summary.completionPercentage}%`} detail={summary.totalProblems === 0 ? 'sem exercícios' : 'do catálogo atual'} />
        <Metric label="Pendentes" value={`${summary.remainingProblems}`} detail={`${summary.attemptedProblems} em andamento`} />
        <Metric label="Favoritos" value={`${summary.favoriteProblems}`} detail={`${summary.reviewProblems} para revisar`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <BreakdownCard title="Progresso por dificuldade" subtitle="Seu avanço em cada nível" icon={<BarChart3 className="size-5 text-muted-foreground" />}>
          <div className="flex flex-col gap-5">
            {dashboard.byDifficulty.map((level) => (
              <ProgressRow key={level.difficulty} label={difficultyLabels[level.difficulty]} solved={level.solvedProblems} total={level.totalProblems} percentage={level.completionPercentage} />
            ))}
          </div>
        </BreakdownCard>

        <BreakdownCard title="Próximo exercício" subtitle="Continue sua sequência com um novo desafio.">
          {nextProblem ? (
            <button onClick={() => onOpenProblem(nextProblem.id)} className="mt-2 flex w-full items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{nextProblem.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{difficultyLabels[nextProblem.difficulty]} · {formatCategory(nextProblem.categories[0])}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0" />
            </button>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Todos os exercícios foram resolvidos.</p>
          )}
        </BreakdownCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <BreakdownCard title="Progresso por categoria" subtitle="Categorias presentes no catálogo">
          {dashboard.byCategory.length === 0 ? <EmptyText>Nenhuma categoria disponível.</EmptyText> : (
            <div className="flex max-h-96 flex-col gap-4 overflow-y-auto pr-1">
              {dashboard.byCategory.map((category) => (
                <ProgressRow key={category.category} label={formatCategory(category.category)} solved={category.solvedProblems} total={category.totalProblems} percentage={category.completionPercentage} />
              ))}
            </div>
          )}
        </BreakdownCard>

        <BreakdownCard title="Atalhos" subtitle="Retome o que importa agora">
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <button onClick={onOpenFavorites} className="flex items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
              <span><Heart className="mb-2 size-4" /><span className="block text-sm font-medium">Favoritos</span><span className="text-xs text-muted-foreground">{summary.favoriteProblems} marcados</span></span><ArrowUpRight className="size-4" />
            </button>
            <button onClick={onOpenReviews} className="flex items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
              <span><BookOpen className="mb-2 size-4" /><span className="block text-sm font-medium">Revisões</span><span className="text-xs text-muted-foreground">{summary.reviewProblems} marcados</span></span><ArrowUpRight className="size-4" />
            </button>
            <button onClick={onOpenExercises} className="flex items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
              <span><BookOpen className="mb-2 size-4" /><span className="block text-sm font-medium">Catálogo</span><span className="text-xs text-muted-foreground">{summary.totalProblems} exercícios</span></span><ArrowUpRight className="size-4" />
            </button>
          </div>
        </BreakdownCard>
      </div>

      <BreakdownCard title="Submissões recentes" subtitle="Sua atividade mais recente" icon={<Clock className="size-5 text-muted-foreground" />}>
        {dashboard.recentSubmissions.length === 0 ? <EmptyText>Nenhuma submissão registrada.</EmptyText> : (
          <div className="divide-y divide-border">
            {dashboard.recentSubmissions.map((submission) => <RecentSubmission key={submission.id} submission={submission} onOpenProblem={onOpenProblem} />)}
          </div>
        )}
      </BreakdownCard>
    </div>
  )
}

function BreakdownCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-6"><div className="mb-6 flex justify-between"><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>{icon}</div>{children}</div>
}

function ProgressRow({ label, solved, total, percentage }: { label: string; solved: number; total: number; percentage: number }) {
  return <div><div className="mb-2 flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted-foreground">{solved} / {total}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${percentage}% resolvido`}><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} /></div></div>
}

function RecentSubmission({ submission, onOpenProblem }: { submission: SubmissionSummary; onOpenProblem: (problemId: string) => void }) {
  return <button onClick={() => onOpenProblem(submission.problemId)} className="flex w-full items-center justify-between gap-4 py-3 text-left hover:bg-muted/40"><span className="min-w-0"><span className="block truncate text-sm font-medium">{submission.problemTitle}</span><span className="mt-1 block text-xs text-muted-foreground">{submission.testsPassed} / {submission.totalTests} testes · {submission.executionTimeMs} ms · {formatDate(submission.submittedAt)}</span></span><span className={`shrink-0 text-xs font-medium ${submission.status === 'ACCEPTED' ? 'text-primary' : 'text-destructive'}`}>{statusLabels[submission.status]}</span></button>
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">{children}</p>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border bg-card p-5"><div className="mb-4 flex justify-between"><span className="text-sm text-muted-foreground">{label}</span><ArrowUpRight className="size-4 text-muted-foreground" /></div><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}
