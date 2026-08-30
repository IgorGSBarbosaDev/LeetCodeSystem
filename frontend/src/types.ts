export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type ProgressStatus = 'NOT_STARTED' | 'ATTEMPTED' | 'SOLVED' | 'REVIEW'

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
  input: string
  expectedOutput: string
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

export type ProblemPackage = {
  schemaVersion: '1.0'
  problems: Omit<Problem, 'progress'>[]
}
