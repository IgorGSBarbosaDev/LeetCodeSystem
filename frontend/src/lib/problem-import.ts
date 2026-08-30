import type { Difficulty, Problem, ProblemPackage } from '../types'

const difficulties = new Set<Difficulty>(['EASY', 'MEDIUM', 'HARD'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(value: unknown, field: string, problemIndex: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Problema ${problemIndex + 1}: "${field}" deve ser um texto não vazio.`)
  }
  return value
}

function requiredStringArray(value: unknown, field: string, problemIndex: number): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Problema ${problemIndex + 1}: "${field}" deve ser uma lista de textos.`)
  }
  return value
}

function validateProblem(value: unknown, index: number): Omit<Problem, 'progress'> {
  if (!isRecord(value)) throw new Error(`Problema ${index + 1}: formato inválido.`)

  const difficulty = requiredString(value.difficulty, 'difficulty', index) as Difficulty
  if (!difficulties.has(difficulty)) {
    throw new Error(`Problema ${index + 1}: difficulty deve ser EASY, MEDIUM ou HARD.`)
  }

  const method = value.method
  const starterCode = value.starterCode
  const solution = value.solution
  if (!isRecord(method) || !isRecord(starterCode) || !isRecord(solution)) {
    throw new Error(`Problema ${index + 1}: method, starterCode e solution são obrigatórios.`)
  }

  if (!Array.isArray(method.parameters) || method.parameters.some((parameter) => !isRecord(parameter))) {
    throw new Error(`Problema ${index + 1}: method.parameters deve ser uma lista válida.`)
  }

  if (typeof starterCode.java !== 'string' || starterCode.java.trim() === '') {
    throw new Error(`Problema ${index + 1}: starterCode.java deve ser um texto não vazio.`)
  }

  if (!Array.isArray(value.examples) || !Array.isArray(value.testCases)) {
    throw new Error(`Problema ${index + 1}: examples e testCases são obrigatórios.`)
  }

  return {
    id: requiredString(value.id, 'id', index),
    title: requiredString(value.title, 'title', index),
    difficulty,
    categories: requiredStringArray(value.categories, 'categories', index),
    description: requiredString(value.description, 'description', index),
    constraints: requiredStringArray(value.constraints, 'constraints', index),
    examples: value.examples.map((example, exampleIndex) => {
      if (!isRecord(example)) throw new Error(`Problema ${index + 1}, exemplo ${exampleIndex + 1}: formato inválido.`)
      return {
        input: requiredString(example.input, 'examples.input', index),
        output: requiredString(example.output, 'examples.output', index),
        ...(typeof example.explanation === 'string' ? { explanation: example.explanation } : {}),
      }
    }),
    method: {
      name: requiredString(method.name, 'method.name', index),
      returnType: requiredString(method.returnType, 'method.returnType', index),
      parameters: method.parameters.map((parameter, parameterIndex) => {
        if (!isRecord(parameter)) throw new Error(`Problema ${index + 1}, parâmetro ${parameterIndex + 1}: formato inválido.`)
        return {
          name: requiredString(parameter.name, 'method.parameters.name', index),
          type: requiredString(parameter.type, 'method.parameters.type', index),
        }
      }),
    },
    starterCode: { java: starterCode.java },
    solution: {
      java: requiredString(solution.java, 'solution.java', index),
      explanation: requiredString(solution.explanation, 'solution.explanation', index),
      timeComplexity: requiredString(solution.timeComplexity, 'solution.timeComplexity', index),
      spaceComplexity: requiredString(solution.spaceComplexity, 'solution.spaceComplexity', index),
    },
    testCases: value.testCases.map((testCase, testCaseIndex) => {
      if (!isRecord(testCase)) throw new Error(`Problema ${index + 1}, caso ${testCaseIndex + 1}: formato inválido.`)
      if (typeof testCase.hidden !== 'boolean') throw new Error(`Problema ${index + 1}, caso ${testCaseIndex + 1}: hidden deve ser booleano.`)
      return {
        input: requiredString(testCase.input, 'testCases.input', index),
        expectedOutput: requiredString(testCase.expectedOutput, 'testCases.expectedOutput', index),
        hidden: testCase.hidden,
      }
    }),
  }
}

export function parseProblemPackage(value: unknown): ProblemPackage {
  if (!isRecord(value) || value.schemaVersion !== '1.0' || !Array.isArray(value.problems)) {
    throw new Error('O arquivo deve conter schemaVersion "1.0" e uma lista problems.')
  }

  const ids = new Set<string>()
  const problems = value.problems.map((problem, index) => {
    const parsed = validateProblem(problem, index)
    if (ids.has(parsed.id)) throw new Error(`ID duplicado no pacote: "${parsed.id}".`)
    ids.add(parsed.id)
    return parsed
  })

  return { schemaVersion: '1.0', problems }
}

export function withInitialProgress(problem: Omit<Problem, 'progress'>): Problem {
  return {
    ...problem,
    progress: { status: 'NOT_STARTED', attempts: 0, favorite: false, reviewRequired: false },
  }
}
