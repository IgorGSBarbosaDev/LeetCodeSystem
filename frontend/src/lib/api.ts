import type {
  ApiError,
  CodeExecutionResult,
  PackageImportResponse,
  PackageValidationResponse,
  ProblemDetails,
  ProblemSummary,
} from '../types'

type BackendProblemDetails = Omit<ProblemDetails, 'starterCode'> & {
  starterCode: string | ProblemDetails['starterCode']
}

export class ApiRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly details: ApiError['errors']

  constructor(status: number, error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = error.code
    this.details = error.errors
  }
}

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init)
  const payload = (await response.json().catch(() => null)) as T | ApiError | null

  if (!response.ok) {
    const error: ApiError = payload && typeof payload === 'object' && 'message' in payload
      ? payload as ApiError
      : { code: 'API_ERROR', message: 'Não foi possível concluir a operação.' }
    throw new ApiRequestError(response.status, error)
  }

  return payload as T
}

function fileBody(file: File): FormData {
  const body = new FormData()
  body.append('file', file, file.name)
  return body
}

export function validateProblemPackage(file: File): Promise<PackageValidationResponse> {
  return request<PackageValidationResponse>('/api/problem-packages/validate', {
    method: 'POST',
    body: fileBody(file),
  })
}

export function importProblemPackage(file: File): Promise<PackageImportResponse> {
  return request<PackageImportResponse>('/api/problem-packages/import', {
    method: 'POST',
    body: fileBody(file),
  })
}

export function fetchProblems(): Promise<ProblemSummary[]> {
  return request<ProblemSummary[]>('/api/problems')
}

export async function fetchProblem(id: string): Promise<ProblemDetails> {
  const problem = await request<BackendProblemDetails>(`/api/problems/${encodeURIComponent(id)}`)
  return {
    ...problem,
    starterCode: typeof problem.starterCode === 'string' ? { java: problem.starterCode } : problem.starterCode,
  }
}

function executeProblem(id: string, action: 'run' | 'submit', code: string): Promise<CodeExecutionResult> {
  return request<CodeExecutionResult>(`/api/problems/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
}

export function runProblem(id: string, code: string): Promise<CodeExecutionResult> {
  return executeProblem(id, 'run', code)
}

export function submitProblem(id: string, code: string): Promise<CodeExecutionResult> {
  return executeProblem(id, 'submit', code)
}
