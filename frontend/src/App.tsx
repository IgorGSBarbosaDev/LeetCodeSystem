import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  BookOpen,
  Check,
  Clock3,
  Code2,
  FileJson,
  Filter,
  Heart,
  LayoutDashboard,
  ListChecks,
  Menu,
  MoreHorizontal,
  Play,
  Search,
  Upload,
  X,
} from 'lucide-react'

import { ApiRequestError, fetchProblem, fetchProblems, importProblemPackage, runProblem, submitProblem, validateProblemPackage } from './lib/api'
import ExecutionResultPanel from './components/ExecutionResultPanel'
import DashboardView from './components/DashboardView'
import { SubmissionHistoryPanel } from './components/SubmissionHistory'
import SubmissionHistoryView from './components/SubmissionHistory'
import { useDashboardData } from './hooks/useDashboardData'
import { useProblemProgress } from './hooks/useProblemProgress'
import type { CodeExecutionResult, Difficulty, PackageValidationResponse, ProblemDetails, ProblemSummary, ProgressStatus } from './types'

type View = 'Dashboard' | 'Exercícios' | 'Favoritos' | 'Revisões' | 'Histórico'
type DifficultyFilter = 'TODAS' | Difficulty
type Feedback = { kind: 'error' | 'success'; message: string; details?: string[] }

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Exercícios', icon: ListChecks },
  { label: 'Favoritos', icon: Heart },
  { label: 'Revisões', icon: BookOpen },
  { label: 'Histórico', icon: Clock3 },
]

const difficultyLabels: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

const categoryLabels: Record<string, string> = {
  ARRAY: 'Array',
  STRING: 'String',
  HASH_TABLE: 'Hash Table',
  TWO_POINTERS: 'Two Pointers',
  SLIDING_WINDOW: 'Sliding Window',
  STACK: 'Stack',
  QUEUE: 'Queue',
  LINKED_LIST: 'Linked List',
  BINARY_SEARCH: 'Binary Search',
  TREE: 'Tree',
  BINARY_TREE: 'Binary Tree',
  BINARY_SEARCH_TREE: 'Binary Search Tree',
  HEAP: 'Heap',
  GRAPH: 'Graph',
  BACKTRACKING: 'Backtracking',
  GREEDY: 'Greedy',
  DYNAMIC_PROGRAMMING: 'Dynamic Programming',
  RECURSION: 'Recursion',
  SORTING: 'Sorting',
  MATRIX: 'Matrix',
  BIT_MANIPULATION: 'Bit Manipulation',
}

function formatCategory(category: string): string {
  return categoryLabels[category] ?? category
}

function feedbackFromError(error: unknown, fallback: string): Feedback {
  if (error instanceof ApiRequestError) {
    return {
      kind: 'error',
      message: error.message,
      details: error.details?.map((detail) => `${detail.path}: ${detail.message}`),
    }
  }
  return { kind: 'error', message: error instanceof Error ? error.message : fallback }
}

const statusLabels: Record<ProgressStatus, string> = {
  NOT_STARTED: 'Não iniciado',
  ATTEMPTED: 'Em andamento',
  SOLVED: 'Resolvido',
  REVIEW: 'Para revisar',
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard')
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('TODAS')
  const [problems, setProblems] = useState<ProblemSummary[]>([])
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetails | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingProblems, setLoadingProblems] = useState(true)
  const [historyForProblem, setHistoryForProblem] = useState<string | null>(null)
  const {
    data: dashboard,
    loading: dashboardLoading,
    refreshing: dashboardRefreshing,
    error: dashboardError,
    refresh: refreshDashboard,
  } = useDashboardData()

  useEffect(() => {
    document.title = 'LeetCodeSystem — Prática de algoritmos'
  }, [])

  const loadProblems = useCallback(async () => {
    setLoadingProblems(true)
    try {
      setProblems(await fetchProblems())
    } catch (error) {
      setNotice(feedbackFromError(error, 'Não foi possível carregar os exercícios da API.').message)
    } finally {
      setLoadingProblems(false)
    }
  }, [])

  useEffect(() => {
    void loadProblems()
  }, [loadProblems])

  const handleProgressError = useCallback((error: unknown, fallback: string) => {
    setNotice(feedbackFromError(error, fallback).message)
  }, [])

  const { pending: progressPending, update: updateProgress } = useProblemProgress({
    setProblems,
    setSelectedProblem,
    refreshDashboard,
    onError: handleProgressError,
  })

  const refreshAfterSubmission = useCallback(async (problemId: string): Promise<string | null> => {
    const [catalog, details, dashboardResult] = await Promise.allSettled([fetchProblems(), fetchProblem(problemId), refreshDashboard()])
    let failed = false

    if (catalog.status === 'fulfilled') {
      setProblems(catalog.value)
    } else {
      failed = true
    }

    if (details.status === 'fulfilled') {
      setSelectedProblem((current) => current?.id === problemId ? details.value : current)
    } else {
      failed = true
    }

    if (dashboardResult.status !== 'fulfilled') {
      failed = true
    }

    const syncError = failed ? 'Submissão concluída, mas não foi possível recarregar todo o progresso.' : null
    if (syncError) setNotice(syncError)
    return syncError
  }, [refreshDashboard])

  const filteredProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')

    return problems.filter((problem) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        problem.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        problem.categories.some((category) => formatCategory(category).toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      const matchesDifficulty = difficulty === 'TODAS' || problem.difficulty === difficulty
      const matchesView =
        activeView === 'Exercícios' ||
        (activeView === 'Favoritos' && problem.progress.favorite) ||
        (activeView === 'Revisões' && problem.progress.reviewRequired)

      return matchesQuery && matchesDifficulty && matchesView
    })
  }, [activeView, difficulty, problems, query])

  const openView = (view: View) => {
    setActiveView(view)
    setMobileMenuOpen(false)
  }

  const handleImported = async (file: File) => {
    const result = await importProblemPackage(file)
    await Promise.all([loadProblems(), refreshDashboard()])
    setShowImport(false)
    setNotice(`${result.importedCount} exercício${result.importedCount === 1 ? '' : 's'} importado${result.importedCount === 1 ? '' : 's'} e persistido${result.importedCount === 1 ? '' : 's'} no SQLite.`)
  }

  const openProblem = async (problem: ProblemSummary) => {
    try {
      setSelectedProblem(await fetchProblem(problem.id))
    } catch (error) {
      setNotice(feedbackFromError(error, 'Não foi possível carregar o exercício.').message)
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <aside
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-card transition-[width] duration-200 lg:flex ${sidebarExpanded ? 'w-64' : 'w-16'}`}
      >
        <Brand expanded={sidebarExpanded} />
        <Navigation activeView={activeView} expanded={sidebarExpanded} onSelect={openView} />
        <div className="border-t border-border p-2">
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              EU
            </div>
            <div className={`min-w-0 flex-1 ${sidebarExpanded ? '' : 'sr-only'}`}>
              <p className="truncate text-sm font-medium">Estudo local</p>
              <p className="truncate text-xs text-muted-foreground">Java</p>
            </div>
            <MoreHorizontal className={`size-4 text-muted-foreground ${sidebarExpanded ? '' : 'sr-only'}`} />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/30 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside
            className="flex h-full w-64 flex-col border-r border-border bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Brand expanded />
            <Navigation activeView={activeView} expanded onSelect={openView} />
          </aside>
        </div>
      )}

      <section className={`transition-[padding] duration-200 ${sidebarExpanded ? 'lg:pl-64' : 'lg:pl-16'}`}>
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 hover:bg-muted lg:hidden"
              aria-label="Abrir menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" />
            </button>
            <span className="hidden text-sm text-muted-foreground sm:inline">Workspace /</span>
            <span className="truncate text-sm font-medium">{activeView}</span>
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">Importar exercícios</span>
            <span className="sm:hidden">Importar</span>
          </button>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 md:p-8">
          {notice && <Notice message={notice} onDismiss={() => setNotice(null)} />}
          {loadingProblems ? (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Carregando exercícios...</div>
          ) : activeView === 'Dashboard' ? (
            <DashboardView
              dashboard={dashboard}
              loading={dashboardLoading}
              refreshing={dashboardRefreshing}
              error={dashboardError}
              onRetry={() => void refreshDashboard().catch((error) => setNotice(feedbackFromError(error, 'Não foi possível atualizar o dashboard.').message))}
              problems={problems}
              onOpenExercises={() => openView('Exercícios')}
              onOpenFavorites={() => openView('Favoritos')}
              onOpenReviews={() => openView('Revisões')}
              onOpenProblem={(problemId) => {
                const summary = problems.find((problem) => problem.id === problemId)
                if (summary) void openProblem(summary)
              }}
            />
          ) : activeView === 'Histórico' ? (
            <SubmissionHistoryView problems={problems} />
          ) : (
            <Exercises
              problems={filteredProblems}
              activeView={activeView}
              query={query}
              onQueryChange={setQuery}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              onSelect={openProblem}
              onToggleFavorite={(problem) => void updateProgress(problem.id, { favorite: !problem.progress.favorite })}
              onToggleReview={(problem) => void updateProgress(problem.id, { reviewRequired: !problem.progress.reviewRequired })}
              progressPending={progressPending}
            />
          )}
        </div>
      </section>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImported} />}
      {selectedProblem && (
        <SolveModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onToggleFavorite={() => void updateProgress(selectedProblem.id, { favorite: !selectedProblem.progress.favorite })}
          onToggleReview={() => void updateProgress(selectedProblem.id, { reviewRequired: !selectedProblem.progress.reviewRequired })}
          progressPending={progressPending[selectedProblem.id] === true}
          onOpenHistory={() => setHistoryForProblem(selectedProblem.id)}
          onSubmissionComplete={refreshAfterSubmission}
        />
      )}
      {historyForProblem && <SubmissionHistoryPanel problemId={historyForProblem} onClose={() => setHistoryForProblem(null)} />}
    </main>
  )
}

function Brand({ expanded }: { expanded: boolean }) {
  return (
    <div className="flex h-16 items-center gap-3 border-b border-border px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Code2 className="size-4" />
      </div>
      <span className={`whitespace-nowrap font-semibold tracking-tight transition-opacity ${expanded ? 'opacity-100' : 'sr-only'}`}>
        LeetCodeSystem
      </span>
    </div>
  )
}

function Navigation({ activeView, expanded, onSelect }: { activeView: View; expanded: boolean; onSelect: (view: View) => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-8 p-2 pt-5">
      <div className="flex flex-col gap-1">
        <p className={`px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground ${expanded ? '' : 'sr-only'}`}>
          Workspace
        </p>
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            title={expanded ? undefined : label}
            aria-label={label}
            aria-current={activeView === label ? 'page' : undefined}
            onClick={() => onSelect(label)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${activeView === label ? 'bg-secondary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          >
            <Icon className="size-4 shrink-0" />
            <span className={expanded ? '' : 'sr-only'}>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground" role="status">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">{message}</p>
      <button className="rounded-md p-1 hover:bg-muted" onClick={onDismiss} aria-label="Fechar aviso">
        <X className="size-4" />
      </button>
    </div>
  )
}

function Exercises({
  problems,
  activeView,
  query,
  onQueryChange,
  difficulty,
  onDifficultyChange,
  onSelect,
  onToggleFavorite,
  onToggleReview,
  progressPending,
}: {
  problems: ProblemSummary[]
  activeView: View
  query: string
  onQueryChange: (value: string) => void
  difficulty: DifficultyFilter
  onDifficultyChange: (value: DifficultyFilter) => void
  onSelect: (problem: ProblemSummary) => void
  onToggleFavorite: (problem: ProblemSummary) => void
  onToggleReview: (problem: ProblemSummary) => void
  progressPending: Record<string, boolean>
}) {
  const heading = activeView === 'Exercícios' ? 'Exercícios' : activeView
  const description = activeView === 'Favoritos' ? 'Acesse rapidamente os exercícios que você marcou.' : activeView === 'Revisões' ? 'Retome os exercícios que precisam de mais uma tentativa.' : 'Pratique, acompanhe e melhore suas habilidades.'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por título ou categoria..."
            aria-label="Buscar exercícios"
            className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={difficulty}
          onChange={(event) => onDifficultyChange(event.target.value as DifficultyFilter)}
          aria-label="Filtrar por dificuldade"
          className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
        >
          <option value="TODAS">Todas as dificuldades</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
        <div className="flex h-10 items-center justify-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground">
          <Filter className="size-4" />
          <span>{problems.length} resultado{problems.length === 1 ? '' : 's'}</span>
        </div>
      </div>

      {problems.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden grid-cols-[44px_1.6fr_100px_1.2fr_110px_80px] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium text-muted-foreground md:grid">
            <span aria-hidden="true" />
            <span>Exercício</span>
            <span>Dificuldade</span>
            <span>Categorias</span>
            <span>Status</span>
            <span className="text-right">Ações</span>
          </div>
          {problems.map((problem) => (
            <div key={problem.id} className="grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-border px-5 py-4 last:border-0 hover:bg-muted/40 md:grid-cols-[44px_1.6fr_100px_1.2fr_110px_80px] md:gap-4">
              <span className={`flex size-5 items-center justify-center rounded-full border ${problem.progress.status === 'SOLVED' ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`} title={statusLabels[problem.progress.status]}>
                {problem.progress.status === 'SOLVED' && <Check className="size-3" />}
              </span>
              <button onClick={() => onSelect(problem)} className="min-w-0 truncate text-left text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {problem.title}
              </button>
              <span className="text-xs text-muted-foreground">{difficultyLabels[problem.difficulty]}</span>
              <span className="hidden truncate text-xs text-muted-foreground md:block">{problem.categories.map(formatCategory).join(' · ')}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{statusLabels[problem.progress.status]}</span>
              <div className="flex items-center justify-end gap-1">
                <button disabled={progressPending[problem.id] === true} onClick={() => onToggleFavorite(problem)} className="rounded-md p-2 hover:bg-muted disabled:cursor-wait disabled:opacity-50" aria-label={`${problem.progress.favorite ? 'Remover dos' : 'Adicionar aos'} favoritos`}>
                  <Heart className={`size-4 ${problem.progress.favorite ? 'fill-current' : ''}`} />
                </button>
                <button disabled={progressPending[problem.id] === true} onClick={() => onToggleReview(problem)} className="hidden rounded-md p-2 hover:bg-muted disabled:cursor-wait disabled:opacity-50 sm:block" aria-label={`${problem.progress.reviewRequired ? 'Remover da' : 'Marcar para'} revisão`}>
                  <BookOpen className={`size-4 ${problem.progress.reviewRequired ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum exercício encontrado" description="Ajuste a busca ou os filtros para encontrar outros exercícios." />
      )}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
      <ListChecks className="size-6 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (file: File) => Promise<void> }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validation, setValidation] = useState<PackageValidationResponse | null>(null)
  const [validating, setValidating] = useState(false)
  const [importing, setImporting] = useState(false)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setSelectedFile(file)
    setFeedback(null)
    setValidation(null)

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ kind: 'error', message: 'O arquivo excede o limite máximo de 5 MiB.' })
      return
    }

    setValidating(true)
    try {
      const validated = await validateProblemPackage(file)
      setValidation(validated)
      setFeedback({ kind: 'success', message: `${validated.problemCount} exercício${validated.problemCount === 1 ? '' : 's'} validado${validated.problemCount === 1 ? '' : 's'}. Confirme para persistir no SQLite.` })
    } catch (error) {
      setFeedback(feedbackFromError(error, 'Não foi possível validar o pacote.'))
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile || !validation) return
    setImporting(true)
    try {
      await onImport(selectedFile)
    } catch (error) {
      setFeedback(feedbackFromError(error, 'Não foi possível importar o pacote.'))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <div className="mb-6 flex justify-between gap-4">
          <div>
            <h2 id="import-title" className="text-lg font-semibold">Importar exercícios</h2>
            <p className="mt-1 text-sm text-muted-foreground">Valide um pacote no formato do PRD antes de adicioná-lo à sessão.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar importação" className="shrink-0 rounded-md p-1 hover:bg-muted"><X className="size-5 text-muted-foreground" /></button>
        </div>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/60">
          <FileJson className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedFile ? selectedFile.name : 'Selecione um arquivo JSON'}</span>
          <span className="text-xs text-muted-foreground">schemaVersion 1.0</span>
          <input type="file" accept="application/json,.json" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>

        {feedback && (
          <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'error' ? 'border-destructive/40 text-destructive' : 'border-border text-muted-foreground'}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
            <p>{feedback.message}</p>
            {feedback.details && feedback.details.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {feedback.details.map((detail) => <li key={detail}>{detail}</li>)}
              </ul>
            )}
          </div>
        )}

        {validation && (
          <div className="mt-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo validado</p>
            <div className="mt-3 space-y-3">
              {validation.problems.map((problem) => (
                <div key={problem.id} className="text-sm">
                  <p className="font-medium">{problem.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {difficultyLabels[problem.difficulty]} · {problem.categories.map(formatCategory).join(' · ')} · {problem.publicTestCases} públicos · {problem.hiddenTestCases} ocultos
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-xs leading-5 text-muted-foreground">A validação é feita pelo backend antes de qualquer gravação. A confirmação reenvia o mesmo arquivo e repete a validação dentro do fluxo de importação.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button disabled={validating || importing} onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-muted disabled:opacity-40">Cancelar</button>
          <button disabled={!validation || validating || importing} onClick={() => void handleImport()} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">
            {importing ? 'Importando...' : 'Importar pacote'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SolveModal({ problem, onClose, onToggleFavorite, onToggleReview, progressPending, onOpenHistory, onSubmissionComplete }: {
  problem: ProblemDetails
  onClose: () => void
  onToggleFavorite: () => void
  onToggleReview: () => void
  progressPending: boolean
  onOpenHistory: () => void
  onSubmissionComplete: (problemId: string) => Promise<string | null>
}) {
  const [left, setLeft] = useState(46)
  const [code, setCode] = useState(problem.starterCode.java)
  const [resizing, setResizing] = useState(false)
  const [result, setResult] = useState<CodeExecutionResult | null>(null)
  const [resultAction, setResultAction] = useState<'Run' | 'Submit'>('Run')
  const [pendingAction, setPendingAction] = useState<'Run' | 'Submit' | null>(null)
  const [runnerError, setRunnerError] = useState<string | null>(null)
  const [syncingProgress, setSyncingProgress] = useState(false)
  const [progressSyncError, setProgressSyncError] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!resizing) return
    const move = (event: PointerEvent) => setLeft(Math.min(68, Math.max(30, (event.clientX / window.innerWidth) * 100)))
    const stop = () => setResizing(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
  }, [resizing])

  const execute = async (kind: 'Run' | 'Submit') => {
    if (pendingAction || syncingProgress) return
    if (!code.trim()) {
      setRunnerResultError('Digite uma solução antes de executar.')
      return
    }

    setPendingAction(kind)
    setResultAction(kind)
    setResult(null)
    setRunnerError(null)
    setProgressSyncError(null)

    try {
      const execution = kind === 'Run'
        ? await runProblem(problem.id, code)
        : await submitProblem(problem.id, code)

      if (mounted.current) {
        setResult(execution)
      }

      if (kind === 'Submit') {
        if (mounted.current) setSyncingProgress(true)
        try {
          const syncError = await onSubmissionComplete(problem.id)
          if (mounted.current) setProgressSyncError(syncError)
        } finally {
          if (mounted.current) setSyncingProgress(false)
        }
      }
    } catch (error) {
      if (mounted.current) {
        setRunnerError(feedbackFromError(error, 'Não foi possível executar a solução.').message)
      }
    } finally {
      if (mounted.current) setPendingAction(null)
    }
  }

  const setRunnerResultError = (message: string) => {
    setResult(null)
    setRunnerError(message)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-muted" aria-label="Fechar exercício"><X className="size-5" /></button>
          <span className="hidden text-sm text-muted-foreground sm:inline">Exercícios /</span>
          <span className="truncate text-sm font-medium">{problem.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button disabled={progressPending} onClick={onToggleReview} className={`hidden rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-50 sm:flex ${problem.progress.reviewRequired ? 'bg-secondary' : ''}`}>
            <BookOpen className="mr-2 size-4" />{problem.progress.reviewRequired ? 'Revisão marcada' : 'Revisar'}
          </button>
          <button disabled={progressPending} onClick={onToggleFavorite} className={`hidden rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-50 sm:flex ${problem.progress.favorite ? 'bg-secondary' : ''}`}>
            <Heart className={`mr-2 size-4 ${problem.progress.favorite ? 'fill-current' : ''}`} />Favoritar
          </button>
          <button onClick={onOpenHistory} aria-label="Histórico" className="flex items-center rounded-lg border border-border px-3 py-2 text-sm"><Clock3 className="size-4 sm:mr-2" /><span className="hidden sm:inline">Histórico</span></button>
          <button disabled={pendingAction !== null || syncingProgress} onClick={() => void execute('Run')} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
            <Play className="size-4" />{pendingAction === 'Run' ? 'Executando...' : 'Run'}
          </button>
          <button disabled={pendingAction !== null || syncingProgress} onClick={() => void execute('Submit')} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
            <Check className="size-4" />{pendingAction === 'Submit' ? 'Enviando...' : 'Submit'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <article className="problem-description min-h-0 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8" style={{ '--problem-width': `${left}%` } as React.CSSProperties}>
          <div className="mx-auto max-w-xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{difficultyLabels[problem.difficulty]}</span>
              <span className="text-xs text-muted-foreground">{problem.categories.map(formatCategory).join(' · ')}</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">{problem.title}</h1>
            <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">{problem.description}</p>
            {problem.examples.map((example, index) => (
              <div key={`${example.input}-${index}`}>
                <h2 className="mt-8 font-semibold">{index === 0 ? 'Exemplo' : `Exemplo ${index + 1}`}</h2>
                <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm leading-6">Input: {example.input}{'\n'}Output: {example.output}{example.explanation ? `\n${example.explanation}` : ''}</pre>
              </div>
            ))}
            <h2 className="mt-8 font-semibold">Restrições</h2>
            <ul className="mt-3 list-disc pl-5 text-sm leading-7 text-muted-foreground">{problem.constraints.map((constraint) => <li key={constraint}>{constraint}</li>)}</ul>
            <h2 className="mt-8 font-semibold">Assinatura</h2>
            <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 font-mono text-sm leading-6">{problem.method.returnType} {problem.method.name}({problem.method.parameters.map((parameter) => `${parameter.type} ${parameter.name}`).join(', ')})</pre>
          </div>
        </article>

        <div
          role="separator"
          aria-label="Redimensionar painéis"
          aria-valuemin={30}
          aria-valuemax={68}
          aria-valuenow={Math.round(left)}
          tabIndex={0}
          onPointerDown={() => setResizing(true)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') setLeft((value) => Math.max(30, value - 3))
            if (event.key === 'ArrowRight') setLeft((value) => Math.min(68, value + 3))
            if (event.key === 'Home') setLeft(30)
            if (event.key === 'End') setLeft(68)
          }}
          className="group hidden w-2 shrink-0 cursor-col-resize items-center justify-center bg-border/40 hover:bg-primary/40 lg:flex"
        >
          <span className="h-12 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
        </div>

        <section className="flex min-h-[420px] min-w-0 flex-1 flex-col bg-card">
          <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
            <span className="rounded-md bg-muted px-3 py-1.5 text-sm font-medium">Solução</span>
              <span className="ml-auto font-mono text-xs text-muted-foreground">Java · {problem.hiddenTestCaseCount} casos ocultos</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-[#1e1e1e] p-1">
            <Editor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{ automaticLayout: true, minimap: { enabled: false }, padding: { top: 16 }, fontSize: 14, tabSize: 4, scrollBeyondLastLine: false, readOnly: pendingAction !== null }}
            />
          </div>
          <ExecutionResultPanel action={resultAction} result={result} pending={pendingAction !== null} error={runnerError} syncing={syncingProgress} syncError={progressSyncError} />
        </section>
      </div>
    </div>
  )
}
