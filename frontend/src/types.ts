export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type ProgressStatus = 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'REVIEW'

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export type Example = {
  input: string
  output: string
  explanation?: string
}

export type MethodParameter = {
  name: string
  type: string
}

export type TestCase = {
  input: Record<string, JsonValue>
  expectedOutput: JsonValue
  hidden: boolean
}

export type ProblemProgress = {
  status: ProgressStatus
  attempts: number
  favorite: boolean
  reviewRequired: boolean
}

export type Problem = {
  id: string
  title: string
  difficulty: Difficulty
  categories: string[]
  description: string
  constraints: string[]
  examples: Example[]
  method: {
    name: string
    returnType: string
    parameters: MethodParameter[]
  }
  starterCode: {
    java: string
  }
  solution: {
    java: string
    explanation: string
    timeComplexity: string
    spaceComplexity: string
  }
  testCases: TestCase[]
  progress: ProblemProgress
}

export type ProblemSummary = Pick<Problem, 'id' | 'title' | 'difficulty' | 'categories' | 'progress'>

export type ProblemDetails = Omit<Problem, 'solution'> & {
  hiddenTestCaseCount: number
}

export type ProblemPackage = {
  schemaVersion: '1.0'
  problems: Omit<Problem, 'progress'>[]
}

export type ProblemImportSummary = {
  id: string
  title: string
  difficulty: Difficulty
  categories: string[]
  publicTestCases: number
  hiddenTestCases: number
}

export type PackageValidationResponse = {
  schemaVersion: '1.0'
  problemCount: number
  problems: ProblemImportSummary[]
}

export type PackageImportResponse = {
  importedCount: number
  problemIds: string[]
}

export type ApiError = {
  code: string
  message: string
  errors?: { path: string; message: string }[]
}
