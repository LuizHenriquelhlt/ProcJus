export type User = { id: string; name: string; email: string; created_at: string }

export type GlossaryTerm = { termo: string; explicacao: string }

export type Analysis = {
  titulo: string
  tipo_documento: string
  resumo_simples: string
  partes: { nome: string; papel: string }[]
  pontos_principais: string[]
  decisao: string | null
  prazos: { descricao: string; prazo: string }[]
  proximos_passos: string[]
  glossario: GlossaryTerm[]
}

export type DocumentStatus = 'processing' | 'ready' | 'error'

export type DocumentSummary = {
  id: string
  filename: string
  page_count: number
  status: DocumentStatus
  title: string | null
  created_at: string
}

export type DocumentDetail = DocumentSummary & {
  error: string | null
  text: string
  analysis: Analysis | null
}

export type Message = { id: string; role: 'user' | 'assistant'; content: string; created_at: string }

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function errorMessage(body: unknown, status: number): string {
  const detail = (body as { detail?: unknown })?.detail
  if (typeof detail === 'string') return detail
  // Erros de validação do FastAPI chegam como lista: [{ loc: ['body', 'email'], msg, type }]
  if (Array.isArray(detail) && detail[0]) {
    const { loc = [], msg = '', type = '' } = detail[0] as { loc?: string[]; msg?: string; type?: string }
    const field = loc[loc.length - 1]
    if (type === 'value_error' && msg.startsWith('Value error, ')) return msg.slice('Value error, '.length)
    if (field === 'email') return 'Informe um e-mail válido.'
    if (field === 'password') return 'A senha precisa ter de 8 a 128 caracteres, com letras e números.'
    if (field === 'name') return 'Informe seu nome (pelo menos 2 letras).'
    if (field === 'content') return 'A pergunta precisa ter entre 1 e 2000 caracteres.'
    return 'Confira os dados informados.'
  }
  if (status >= 500) return 'O servidor teve um problema. Tente novamente em instantes.'
  return 'Algo deu errado. Tente novamente.'
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...init,
      headers: isForm ? init.headers : { 'Content-Type': 'application/json', ...init.headers },
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor.')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, errorMessage(body, res.status))
  return body as T
}

export const api = {
  me: () => request<User>('/auth/me'),
  login: (email: string, password: string) =>
    request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    request<User>('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  listDocuments: () => request<DocumentSummary[]>('/documents'),
  getDocument: (id: string) => request<DocumentDetail>(`/documents/${id}`),
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<DocumentSummary>('/documents', { method: 'POST', body: form })
  },
  retryDocument: (id: string) => request<DocumentSummary>(`/documents/${id}/retry`, { method: 'POST' }),
  deleteDocument: (id: string) => request<void>(`/documents/${id}`, { method: 'DELETE' }),

  listMessages: (id: string) => request<Message[]>(`/documents/${id}/messages`),
  sendMessage: (id: string, content: string) =>
    request<Message[]>(`/documents/${id}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),
}
