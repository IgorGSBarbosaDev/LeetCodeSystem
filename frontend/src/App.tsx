import { useCallback, useEffect, useMemo, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Check,
  Code2,
  FileJson,
  Filter,
  Heart,
  LayoutDashboard,
  ListChecks,
  Menu,
  MoreHorizontal,
  Play,
  RotateCcw,
  Search,
  Upload,
  X,
} from 'lucide-react'

import { demoProblems } from './data/demoProblems'
import { parseProblemPackage, withInitialProgress } from './lib/problem-import'
import type { Difficulty, Problem, ProblemProgress, ProblemPackage, ProgressStatus } from './types'

type View = 'Dashboard' | 'Exercícios' | 'Favoritos' | 'Revisões'
type DifficultyFilter = 'TODAS' | Difficulty
type Feedback = { kind: 'error' | 'success'; message: string }

const navItems: { label: View; icon: typeof LayoutDashboard }[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Exercícios', icon: ListChecks },
  { label: 'Favoritos', icon: Heart },
  { label: 'Revisões', icon: BookOpen },
]

const difficultyLabels: Record<Difficulty, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
}

const statusLabels: Record<ProgressStatus, string> = {
  NOT_STARTED: 'Não iniciado',
  ATTEMPTED: 'Em andamento',
  SOLVED: 'Resolvido',
  REVIEW: 'Para revisar',
}

function toggleReview(progress: ProblemProgress): Partial<ProblemProgress> {
  const reviewRequired = !progress.reviewRequired
  return {
    reviewRequired,
    status: reviewRequired ? 'REVIEW' : progress.attempts > 0 ? 'ATTEMPTED' : 'NOT_STARTED',
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<View>('Dashboard')
  const [query, setQuery] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyFilter>('TODAS')
  const [problems, setProblems] = useState<Problem[]>(demoProblems)
  const [selectedProblem, setSelectedProblem] = useState<Problem | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const [notice, setNotice] = useState<string | null>(
    'Modo de demonstração: a API Spring Boot ainda não possui endpoints de problemas ou execução.',
  )

  useEffect(() => {
    document.title = 'LeetCodeSystem — Prática de algoritmos'
  }, [])

  const updateProgress = useCallback((problemId: string, change: Partial<ProblemProgress>) => {
    setProblems((current) =>
      current.map((problem) =>
        problem.id === problemId
          ? { ...problem, progress: { ...problem.progress, ...change } }
          : problem,
      ),
    )
    setSelectedProblem((current) =>
      current?.id === problemId
        ? { ...current, progress: { ...current.progress, ...change } }
        : current,
    )
  }, [])

  const filteredProblems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')

    return problems.filter((problem) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        problem.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
        problem.categories.some((category) => category.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
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

  const handleImported = (problemPackage: ProblemPackage) => {
    const imported = problemPackage.problems.map(withInitialProgress)
    const currentIds = new Set(problems.map((problem) => problem.id))
    const newProblems = imported.filter((problem) => !currentIds.has(problem.id))
    setProblems((current) => {
      const latestIds = new Set(current.map((problem) => problem.id))
      return [...current, ...newProblems.filter((problem) => !latestIds.has(problem.id))]
    })
    setShowImport(false)
    setNotice(
      newProblems.length === 0
        ? 'Nenhum exercício novo foi adicionado: os IDs do pacote já existem na sessão.'
        : `${newProblems.length} exercício${newProblems.length === 1 ? '' : 's'} validado${newProblems.length === 1 ? '' : 's'} e adicionado${newProblems.length === 1 ? '' : 's'} à sessão. A persistência no SQLite aguarda a API do backend.`,
    )
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
          {activeView === 'Dashboard' ? (
            <Dashboard problems={problems} onOpen={() => openView('Exercícios')} />
          ) : (
            <Exercises
              problems={filteredProblems}
              activeView={activeView}
              query={query}
              onQueryChange={setQuery}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
              onSelect={setSelectedProblem}
              onToggleFavorite={(problem) => updateProgress(problem.id, { favorite: !problem.progress.favorite })}
              onToggleReview={(problem) =>
                updateProgress(problem.id, toggleReview(problem.progress))
              }
            />
          )}
        </div>
      </section>

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImported} />}
      {selectedProblem && (
        <SolveModal
          problem={selectedProblem}
          onClose={() => setSelectedProblem(null)}
          onToggleFavorite={() => updateProgress(selectedProblem.id, { favorite: !selectedProblem.progress.favorite })}
          onToggleReview={() =>
            updateProgress(selectedProblem.id, toggleReview(selectedProblem.progress))
          }
        />
      )}
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

function Dashboard({ problems, onOpen }: { problems: Problem[]; onOpen: () => void }) {
  const solved = problems.filter((problem) => problem.progress.status === 'SOLVED').length
  const attempted = problems.filter((problem) => problem.progress.attempts > 0 && problem.progress.status !== 'SOLVED').length
  const total = problems.length
  const completion = total === 0 ? 0 : Math.round((solved / total) * 100)
  const nextProblem = problems.find((problem) => problem.progress.status !== 'SOLVED')

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">Prática local de Java</p>
        <h1 className="text-3xl font-semibold tracking-tight">Seu espaço de estudos.</h1>
        <p className="mt-2 text-muted-foreground">Resolva exercícios, acompanhe tentativas e revise seus pontos fracos.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Exercícios resolvidos" value={`${solved}`} detail={`de ${total}`} />
        <Metric label="Progresso geral" value={`${completion}%`} detail={total === 0 ? 'sem exercícios' : 'do catálogo atual'} />
        <Metric label="Em andamento" value={`${attempted}`} detail="com tentativa registrada" />
        <Metric label="Para revisar" value={`${problems.filter((problem) => problem.progress.reviewRequired).length}`} detail="marcados por você" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex justify-between">
            <div>
              <h2 className="font-semibold">Progresso por dificuldade</h2>
              <p className="mt-1 text-sm text-muted-foreground">Seu avanço em cada nível</p>
            </div>
            <BarChart3 className="size-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-5">
            {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((level) => {
              const levelProblems = problems.filter((problem) => problem.difficulty === level)
              const levelSolved = levelProblems.filter((problem) => problem.progress.status === 'SOLVED').length
              const percentage = levelProblems.length === 0 ? 0 : Math.round((levelSolved / levelProblems.length) * 100)
              return (
                <div key={level}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium">{difficultyLabels[level]}</span>
                    <span className="text-muted-foreground">{levelSolved} / {levelProblems.length}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted" aria-label={`${percentage}% resolvido`}>
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">Próximo exercício</h2>
          <p className="mt-2 text-sm text-muted-foreground">Continue sua sequência com um novo desafio.</p>
          {nextProblem ? (
            <button onClick={onOpen} className="mt-6 flex w-full items-center justify-between rounded-lg border border-border p-4 text-left hover:bg-muted">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{nextProblem.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{difficultyLabels[nextProblem.difficulty]} · {nextProblem.categories[0]}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0" />
            </button>
          ) : (
            <p className="mt-6 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">Todos os exercícios foram resolvidos.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <ArrowUpRight className="size-4 text-muted-foreground" />
      </div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
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
}: {
  problems: Problem[]
  activeView: View
  query: string
  onQueryChange: (value: string) => void
  difficulty: DifficultyFilter
  onDifficultyChange: (value: DifficultyFilter) => void
  onSelect: (problem: Problem) => void
  onToggleFavorite: (problem: Problem) => void
  onToggleReview: (problem: Problem) => void
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
              <span className="hidden truncate text-xs text-muted-foreground md:block">{problem.categories.join(' · ')}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{statusLabels[problem.progress.status]}</span>
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => onToggleFavorite(problem)} className="rounded-md p-2 hover:bg-muted" aria-label={`${problem.progress.favorite ? 'Remover dos' : 'Adicionar aos'} favoritos`}>
                  <Heart className={`size-4 ${problem.progress.favorite ? 'fill-current' : ''}`} />
                </button>
                <button onClick={() => onToggleReview(problem)} className="hidden rounded-md p-2 hover:bg-muted sm:block" aria-label={`${problem.progress.reviewRequired ? 'Remover da' : 'Marcar para'} revisão`}>
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

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (problemPackage: ProblemPackage) => void }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [parsedPackage, setParsedPackage] = useState<ProblemPackage | null>(null)

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setSelectedFile(file)
    setFeedback(null)
    setParsedPackage(null)

    try {
      const raw = JSON.parse(await file.text()) as unknown
      const validated = parseProblemPackage(raw)
      setParsedPackage(validated)
      setFeedback({ kind: 'success', message: `${validated.problems.length} exercício${validated.problems.length === 1 ? '' : 's'} pronto${validated.problems.length === 1 ? '' : 's'} para importação.` })
    } catch (error) {
      setFeedback({ kind: 'error', message: error instanceof SyntaxError ? 'O arquivo não contém JSON válido.' : error instanceof Error ? error.message : 'Não foi possível validar o pacote.' })
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

        {feedback && <p className={`mt-4 rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'error' ? 'border-destructive/40 text-destructive' : 'border-border text-muted-foreground'}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.message}</p>}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">A validação e a inclusão abaixo são locais nesta sessão. A gravação definitiva no SQLite depende do endpoint de importação do backend.</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button disabled={!parsedPackage} onClick={() => parsedPackage && onImport(parsedPackage)} className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-40">Adicionar à sessão</button>
        </div>
      </div>
    </div>
  )
}

function SolveModal({ problem, onClose, onToggleFavorite, onToggleReview }: { problem: Problem; onClose: () => void; onToggleFavorite: () => void; onToggleReview: () => void }) {
  const [left, setLeft] = useState(46)
  const [code, setCode] = useState(problem.starterCode.java)
  const [resizing, setResizing] = useState(false)
  const [runnerMessage, setRunnerMessage] = useState('Execute a solução quando o Java Runner estiver disponível.')

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

  const requestRun = (kind: 'Run' | 'Submit') => {
    setRunnerMessage(`${kind} aguardando o endpoint do Java Runner no backend. Nenhum resultado foi simulado.`)
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
          <button onClick={onToggleReview} className={`hidden rounded-lg border border-border px-3 py-2 text-sm sm:flex ${problem.progress.reviewRequired ? 'bg-secondary' : ''}`}>
            <BookOpen className="mr-2 size-4" />{problem.progress.reviewRequired ? 'Revisão marcada' : 'Revisar'}
          </button>
          <button onClick={onToggleFavorite} className={`hidden rounded-lg border border-border px-3 py-2 text-sm sm:flex ${problem.progress.favorite ? 'bg-secondary' : ''}`}>
            <Heart className={`mr-2 size-4 ${problem.progress.favorite ? 'fill-current' : ''}`} />Favoritar
          </button>
          <button onClick={() => requestRun('Run')} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
            <Play className="size-4" />Run
          </button>
          <button onClick={() => requestRun('Submit')} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Check className="size-4" />Submit
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <article className="problem-description min-h-0 overflow-y-auto border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8" style={{ '--problem-width': `${left}%` } as React.CSSProperties}>
          <div className="mx-auto max-w-xl">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{difficultyLabels[problem.difficulty]}</span>
              <span className="text-xs text-muted-foreground">{problem.categories.join(' · ')}</span>
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
            <span className="ml-auto font-mono text-xs text-muted-foreground">Java</span>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden bg-[#1e1e1e] p-1">
            <Editor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value ?? '')}
              options={{ automaticLayout: true, minimap: { enabled: false }, padding: { top: 16 }, fontSize: 14, tabSize: 4, scrollBeyondLastLine: false }}
            />
          </div>
          <div className="border-t border-border bg-muted/30 p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado</span>
              <span className="text-xs text-muted-foreground">{problem.testCases.filter((testCase) => !testCase.hidden).length} casos públicos</span>
            </div>
            <div className="rounded-lg border border-border bg-background p-3 font-mono text-xs text-muted-foreground">{runnerMessage}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
