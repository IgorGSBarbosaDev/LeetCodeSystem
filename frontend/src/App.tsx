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
import { containDialogFocus } from './lib/utils'
import type { CodeExecutionResult, Difficulty, PackageValidationResponse, ProblemDetails, ProblemSummary, ProgressStatus } from './types'

type View = 'Dashboard' | 'Exercícios' | 'Favoritos' | 'Revisões' | 'Histórico'
type DifficultyFilter = 'TODAS' | Difficulty
type ProgressFilter = 'TODOS' | 'RESOLVIDOS' | 'PENDENTES'
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

type SolvePanel = 'problem' | 'solution' | 'results'
type SolveDivider = 'problem-solution' | 'solution-results'
type SolveColumns = { problem: number; solution: number; results: number }

function resizeSolveColumns(columns: SolveColumns, divider: SolveDivider, delta: number, availableWidth: number): SolveColumns {
  const minProblem = 240 / availableWidth * 100
  const minSolution = 360 / availableWidth * 100
  const minResults = 280 / availableWidth * 100

  if (divider === 'problem-solution') {
    const pairWidth = columns.problem + columns.solution
    const problem = Math.min(pairWidth - minSolution, Math.max(minProblem, columns.problem + delta))
    return { ...columns, problem, solution: pairWidth - problem }
  }

  const pairWidth = columns.solution + columns.results
  const solution = Math.min(pairWidth - minResults, Math.max(minSolution, columns.solution + delta))
  return { ...columns, solution, results: pairWidth - solution }
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard')
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('TODAS')
  const [category, setCategory] = useState('TODAS')
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('TODOS')
  const [problems, setProblems] = useState<ProblemSummary[]>([])
  const [selectedProblem, setSelectedProblem] = useState<ProblemDetails | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [notice, setNotice] = useState<Feedback | null>(null)
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

  const loadProblems = useCallback(async (): Promise<boolean> => {
    setLoadingProblems(true)
    try {
      setProblems(await fetchProblems())
      return true
    } catch (error) {
      setNotice(feedbackFromError(error, 'Não foi possível carregar os exercícios da API.'))
      return false
    } finally {
      setLoadingProblems(false)
    }
  }, [])

  useEffect(() => {
    void loadProblems()
  }, [loadProblems])

  const handleProgressError = useCallback((error: unknown, fallback: string) => {
    setNotice(feedbackFromError(error, fallback))
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
      const matchesCategory = category === 'TODAS' || problem.categories.includes(category)
      const matchesProgress = progressFilter === 'TODOS' ||
        (progressFilter === 'RESOLVIDOS'
          ? problem.progress.status === 'SOLVED'
          : problem.progress.status !== 'SOLVED')
      const matchesView =
        activeView === 'Exercícios' ||
        (activeView === 'Favoritos' && problem.progress.favorite) ||
        (activeView === 'Revisões' && problem.progress.reviewRequired)

      return matchesQuery && matchesDifficulty && matchesCategory && matchesProgress && matchesView
    })
  }, [activeView, category, difficulty, problems, progressFilter, query])

  const availableCategories = useMemo(() => {
    const values = new Set(problems.flatMap((problem) => problem.categories))
    return [...values].sort((left, right) => formatCategory(left).localeCompare(formatCategory(right), 'pt-BR'))
  }, [problems])

  const openView = (view: View) => {
    setActiveView(view)
    setMobileMenuOpen(false)
  }

  const handleImported = async (file: File) => {
    const result = await importProblemPackage(file)
    setShowImport(false)
    setNotice({
      kind: 'success',
      message: `${result.importedCount} exercício${result.importedCount === 1 ? '' : 's'} importado${result.importedCount === 1 ? '' : 's'} e persistido${result.importedCount === 1 ? '' : 's'} no SQLite.`,
    })
    void Promise.allSettled([loadProblems(), refreshDashboard()]).then(([catalog, dashboardResult]) => {
      const catalogFailed = catalog.status === 'rejected' || (catalog.status === 'fulfilled' && !catalog.value)
      if (catalogFailed || dashboardResult.status === 'rejected') {
        setNotice({ kind: 'error', message: 'Pacote importado com sucesso, mas a lista ou o dashboard não pôde ser atualizado. Atualize a tela para ver os dados novos.' })
      }
    })
  }

  const openProblem = async (problem: ProblemSummary) => {
    try {
      setSelectedProblem(await fetchProblem(problem.id))
    } catch (error) {
      setNotice(feedbackFromError(error, 'Não foi possível carregar o exercício.'))
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
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
              <Code2 className="size-4" aria-hidden="true" />
            </div>
            <div className={`min-w-0 flex-1 ${sidebarExpanded ? '' : 'sr-only'}`}>
              <p className="truncate text-sm font-medium">Execução local</p>
              <p className="truncate text-xs text-muted-foreground">Java · SQLite</p>
            </div>
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
              className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted lg:hidden"
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
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Upload className="size-4" />
            <span className="hidden sm:inline">Importar exercícios</span>
            <span className="sm:hidden">Importar</span>
          </button>
        </header>

        <div className="mx-auto max-w-[1400px] p-5 md:p-8">
          {notice && <Notice feedback={notice} onDismiss={() => setNotice(null)} />}
          {loadingProblems ? (
            <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground" role="status">Carregando exercícios...</div>
          ) : activeView === 'Dashboard' ? (
            <DashboardView
              dashboard={dashboard}
              loading={dashboardLoading}
              refreshing={dashboardRefreshing}
              error={dashboardError}
              onRetry={() => void refreshDashboard().catch((error) => setNotice(feedbackFromError(error, 'Não foi possível atualizar o dashboard.')))}
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
              category={category}
              onCategoryChange={setCategory}
              categories={availableCategories}
              progressFilter={progressFilter}
              onProgressFilterChange={setProgressFilter}
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

function Notice({ feedback, onDismiss }: { feedback: Feedback; onDismiss: () => void }) {
  const error = feedback.kind === 'error'
  return (
    <div className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${error ? 'border-destructive/40 bg-destructive/[0.04] text-destructive' : 'border-border bg-muted/50 text-foreground'}`} role={error ? 'alert' : 'status'}>
      {error ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p>{feedback.message}</p>
        {feedback.details && feedback.details.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
            {feedback.details.map((detail) => <li key={detail}>{detail}</li>)}
          </ul>
        )}
      </div>
      <button type="button" className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted md:size-8" onClick={onDismiss} aria-label="Fechar aviso">
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
  category,
  onCategoryChange,
  categories,
  progressFilter,
  onProgressFilterChange,
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
  category: string
  onCategoryChange: (value: string) => void
  categories: string[]
  progressFilter: ProgressFilter
  onProgressFilterChange: (value: ProgressFilter) => void
  onSelect: (problem: ProblemSummary) => void
  onToggleFavorite: (problem: ProblemSummary) => void
  onToggleReview: (problem: ProblemSummary) => void
  progressPending: Record<string, boolean>
}) {
  const heading = activeView === 'Exercícios' ? 'Exercícios' : activeView
  const description = activeView === 'Favoritos' ? 'Acesse rapidamente os exercícios que você marcou.' : activeView === 'Revisões' ? 'Retome os exercícios que precisam de mais uma tentativa.' : 'Pratique, acompanhe e melhore suas habilidades.'
  const emptyDescription = activeView === 'Favoritos'
    ? 'Marque exercícios com o coração ou ajuste a busca e os filtros para encontrar seus favoritos.'
    : activeView === 'Revisões'
      ? 'Marque exercícios para revisão ou ajuste a busca e os filtros para encontrar os itens pendentes.'
      : 'Ajuste a busca ou os filtros para encontrar outros exercícios.'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{heading}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Buscar por título ou categoria..."
              aria-label="Buscar exercícios"
              className="h-11 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring md:h-10"
            />
          </div>
          <div className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-input px-3 text-sm text-muted-foreground md:h-10">
            <Filter className="size-4" aria-hidden="true" />
            <span>{problems.length} resultado{problems.length === 1 ? '' : 's'}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={difficulty}
            onChange={(event) => onDifficultyChange(event.target.value as DifficultyFilter)}
            aria-label="Filtrar por dificuldade"
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm md:h-10"
          >
            <option value="TODAS">Todas as dificuldades</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
          <select
            value={category}
            onChange={(event) => onCategoryChange(event.target.value)}
            aria-label="Filtrar por categoria"
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm md:h-10"
          >
            <option value="TODAS">Todas as categorias</option>
            {categories.map((value) => <option key={value} value={value}>{formatCategory(value)}</option>)}
          </select>
          <select
            value={progressFilter}
            onChange={(event) => onProgressFilterChange(event.target.value as ProgressFilter)}
            aria-label="Filtrar por progresso"
            className="h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm md:h-10"
          >
            <option value="TODOS">Todos os status</option>
            <option value="RESOLVIDOS">Resolvidos</option>
            <option value="PENDENTES">Não resolvidos</option>
          </select>
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
            <div key={problem.id} className="grid grid-cols-[20px_minmax(0,1fr)_auto_92px] items-center gap-3 border-b border-border px-5 py-4 last:border-0 hover:bg-muted/40 md:grid-cols-[44px_1.6fr_100px_1.2fr_110px_80px] md:gap-4">
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
                <button type="button" disabled={progressPending[problem.id] === true} onClick={() => onToggleFavorite(problem)} className="flex size-11 items-center justify-center rounded-md hover:bg-muted disabled:cursor-wait disabled:opacity-50 md:size-8" aria-label={`${problem.progress.favorite ? 'Remover dos' : 'Adicionar aos'} favoritos`} aria-pressed={problem.progress.favorite}>
                  <Heart className={`size-4 ${problem.progress.favorite ? 'fill-current' : ''}`} />
                </button>
                <button type="button" disabled={progressPending[problem.id] === true} onClick={() => onToggleReview(problem)} className="flex size-11 items-center justify-center rounded-md hover:bg-muted disabled:cursor-wait disabled:opacity-50 md:size-8" aria-label={`${problem.progress.reviewRequired ? 'Remover da' : 'Marcar para'} revisão`} aria-pressed={problem.progress.reviewRequired}>
                  <BookOpen className={`size-4 ${problem.progress.reviewRequired ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhum exercício encontrado" description={emptyDescription} />
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
  const validationRequest = useRef(0)

  useEffect(() => () => {
    validationRequest.current += 1
  }, [])

  const handleFile = async (file: File | undefined) => {
    if (!file || importing) return
    const requestId = ++validationRequest.current
    setSelectedFile(file)
    setFeedback(null)
    setValidation(null)
    setValidating(false)

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ kind: 'error', message: 'O arquivo excede o limite máximo de 5 MiB.' })
      return
    }

    setValidating(true)
    try {
      const validated = await validateProblemPackage(file)
      if (requestId !== validationRequest.current) return
      setValidation(validated)
      setFeedback({ kind: 'success', message: `${validated.problemCount} exercício${validated.problemCount === 1 ? '' : 's'} validado${validated.problemCount === 1 ? '' : 's'}. Confirme para persistir no SQLite.` })
    } catch (error) {
      if (requestId === validationRequest.current) {
        setFeedback(feedbackFromError(error, 'Não foi possível validar o pacote.'))
      }
    } finally {
      if (requestId === validationRequest.current) setValidating(false)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/40 p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-border bg-card p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="import-title" aria-describedby="import-description" onKeyDown={(event) => containDialogFocus(event, onClose)}>
        <div className="mb-6 flex justify-between gap-4">
          <div>
            <h2 id="import-title" className="text-lg font-semibold">Importar exercícios</h2>
            <p id="import-description" className="mt-1 text-sm text-muted-foreground">Valide um pacote no formato do PRD antes de adicioná-lo à sessão.</p>
          </div>
          <button autoFocus onClick={onClose} aria-label="Fechar importação" className="flex size-11 shrink-0 items-center justify-center rounded-md hover:bg-muted md:size-8"><X className="size-5 text-muted-foreground" /></button>
        </div>

        <label className={`flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-10 text-center ${importing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/60'}`}>
          <FileJson className="size-8 text-muted-foreground" />
          <span className="text-sm font-medium">{selectedFile ? selectedFile.name : 'Selecione um arquivo JSON'}</span>
          <span className="text-xs text-muted-foreground">schemaVersion 1.0</span>
          <input type="file" accept="application/json,.json" className="sr-only" disabled={importing} onChange={(event) => handleFile(event.target.files?.[0])} />
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
          <button disabled={validating || importing} onClick={onClose} className="min-h-11 rounded-lg px-4 py-2 text-sm hover:bg-muted disabled:opacity-40">Cancelar</button>
          <button disabled={!validation || validating || importing} onClick={() => void handleImport()} className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">
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
  const [columns, setColumns] = useState<SolveColumns>({ problem: 24, solution: 48, results: 28 })
  const [activePanel, setActivePanel] = useState<SolvePanel>('problem')
  const [code, setCode] = useState(problem.starterCode.java)
  const [activeDivider, setActiveDivider] = useState<SolveDivider | null>(null)
  const [result, setResult] = useState<CodeExecutionResult | null>(null)
  const [resultAction, setResultAction] = useState<'Run' | 'Submit'>('Run')
  const [pendingAction, setPendingAction] = useState<'Run' | 'Submit' | null>(null)
  const [runnerError, setRunnerError] = useState<string | null>(null)
  const [syncingProgress, setSyncingProgress] = useState(false)
  const [progressSyncError, setProgressSyncError] = useState<string | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const resizeStartRef = useRef<{ divider: SolveDivider; pointerX: number; columns: SolveColumns } | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!activeDivider) return
    const move = (event: PointerEvent) => {
      const start = resizeStartRef.current
      const width = layoutRef.current?.getBoundingClientRect().width
      if (!start || !width) return
      const availableWidth = Math.max(width - 16, 1)
      const pointerDelta = event.clientX - start.pointerX
      if (!Number.isFinite(pointerDelta)) return
      const delta = (pointerDelta / availableWidth) * 100
      setColumns(resizeSolveColumns(start.columns, start.divider, delta, availableWidth))
    }
    const stop = () => {
      resizeStartRef.current = null
      setActiveDivider(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [activeDivider])

  const beginResize = (divider: SolveDivider, event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== undefined && event.button !== 0) return
    event.preventDefault()
    resizeStartRef.current = { divider, pointerX: event.clientX, columns }
    setActiveDivider(divider)
  }

  const resizeFromKeyboard = (divider: SolveDivider, event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const key = event.key
    const width = layoutRef.current?.getBoundingClientRect().width || window.innerWidth
    const availableWidth = Math.max(width - 16, 1)

    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const delta = key === 'ArrowRight' ? 2 : -2
      setColumns((current) => resizeSolveColumns(current, divider, delta, availableWidth))
      return
    }

    setColumns((current) => {
      const isFirstDivider = divider === 'problem-solution'
      const leadingWidth = isFirstDivider ? current.problem : current.solution
      const pairWidth = isFirstDivider ? current.problem + current.solution : current.solution + current.results
      const minLeading = (isFirstDivider ? 240 : 360) / availableWidth * 100
      const minTrailing = (isFirstDivider ? 360 : 280) / availableWidth * 100
      const targetWidth = key === 'Home' ? minLeading : pairWidth - minTrailing
      return resizeSolveColumns(current, divider, targetWidth - leadingWidth, availableWidth)
    })
  }

  const execute = async (kind: 'Run' | 'Submit') => {
    if (pendingAction || syncingProgress) return
    if (!code.trim()) {
      setActivePanel('results')
      setRunnerResultError('Digite uma solução antes de executar.')
      return
    }

    setActivePanel('results')
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

  const availableWidth = Math.max((layoutRef.current?.getBoundingClientRect().width || window.innerWidth) - 16, 1)
  const minProblemShare = 240 / availableWidth * 100
  const minSolutionShare = 360 / availableWidth * 100
  const minResultsShare = 280 / availableWidth * 100
  const problemTrack = `minmax(240px, calc(${columns.problem}% - ${columns.problem * 0.16}px))`
  const solutionTrack = `minmax(360px, calc(${columns.solution}% - ${columns.solution * 0.16}px))`
  const resultsTrack = `minmax(280px, calc(${columns.results}% - ${columns.results * 0.16}px))`

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-labelledby="solve-title" onKeyDown={(event) => containDialogFocus(event, onClose)}>
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button autoFocus onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:size-9" aria-label="Fechar exercício"><X className="size-5" /></button>
          <span className="hidden text-sm text-muted-foreground sm:inline">Exercícios /</span>
          <span className="truncate text-sm font-medium">{problem.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={progressPending} onClick={onToggleReview} aria-pressed={problem.progress.reviewRequired} className={`hidden rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-50 sm:flex ${problem.progress.reviewRequired ? 'bg-secondary' : ''}`}>
            <BookOpen className="mr-2 size-4" />{problem.progress.reviewRequired ? 'Revisão marcada' : 'Revisar'}
          </button>
          <button type="button" disabled={progressPending} onClick={onToggleFavorite} aria-pressed={problem.progress.favorite} className={`hidden rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-wait disabled:opacity-50 sm:flex ${problem.progress.favorite ? 'bg-secondary' : ''}`}>
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

      <div className="grid shrink-0 grid-cols-3 gap-1 border-b border-border bg-card p-2 lg:hidden" role="group" aria-label="Painel exibido">
        {([
          ['problem', 'Enunciado'],
          ['solution', 'Código'],
          ['results', 'Resultado'],
        ] as const).map(([panel, label]) => (
          <button
            key={panel}
            type="button"
            aria-pressed={activePanel === panel}
            onClick={() => setActivePanel(panel)}
            className={`min-h-11 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activePanel === panel ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={layoutRef}
        className="flex min-h-0 flex-1 flex-col lg:grid"
        style={{ gridTemplateColumns: `${problemTrack} 8px ${solutionTrack} 8px ${resultsTrack}` }}
      >
        <article
          id="solve-problem-pane"
          className={`${activePanel === 'problem' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-y-auto border-b border-border p-5 lg:flex lg:border-b-0 lg:p-6`}
        >
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{difficultyLabels[problem.difficulty]}</span>
              <span className="text-xs text-muted-foreground">{problem.categories.map(formatCategory).join(' · ')}</span>
            </div>
            <h1 id="solve-title" className="text-3xl font-semibold tracking-tight">{problem.title}</h1>
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
          aria-orientation="vertical"
          aria-label="Redimensionar enunciado e código"
          aria-controls="solve-problem-pane solve-code-pane"
          aria-valuemin={Math.ceil(minProblemShare)}
          aria-valuemax={Math.floor(100 - columns.results - minSolutionShare)}
          aria-valuenow={Math.round(columns.problem)}
          tabIndex={0}
          onPointerDown={(event) => beginResize('problem-solution', event)}
          onKeyDown={(event) => resizeFromKeyboard('problem-solution', event)}
          className="group hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-border/40 hover:bg-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:flex"
        >
          <span className="h-12 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
        </div>

        <section
          id="solve-code-pane"
          className={`${activePanel === 'solution' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card lg:flex`}
          aria-label="Editor Java"
        >
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
        </section>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionar código e resultados"
          aria-controls="solve-code-pane solve-results-pane"
          aria-valuemin={Math.ceil(minSolutionShare)}
          aria-valuemax={Math.floor(100 - columns.problem - minResultsShare)}
          aria-valuenow={Math.round(columns.solution)}
          tabIndex={0}
          onPointerDown={(event) => beginResize('solution-results', event)}
          onKeyDown={(event) => resizeFromKeyboard('solution-results', event)}
          className="group hidden w-2 shrink-0 cursor-col-resize touch-none items-center justify-center bg-border/40 hover:bg-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:flex"
        >
          <span className="h-12 w-1 rounded-full bg-muted-foreground/40 group-hover:bg-primary" />
        </div>

        <aside
          id="solve-results-pane"
          className={`${activePanel === 'results' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex`}
          aria-label="Resultado da execução"
        >
          <ExecutionResultPanel action={resultAction} result={result} pending={pendingAction !== null} error={runnerError} syncing={syncingProgress} syncError={progressSyncError} />
        </aside>
      </div>
    </div>
  )
}
