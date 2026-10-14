import { ApiError, type Api, type DocumentDetail, type DocumentSummary, type Message, type User } from '../api'
import { FALLBACK_REPLY, SAMPLES } from './samples'

// Implementação da API que roda inteira no navegador, para a demo publicada no GitHub Pages.
// Não há servidor: contas, documentos e conversas ficam no localStorage deste navegador.

type StoredUser = User & { password: string }
type StoredDoc = DocumentDetail & { owner: string }
type StoredMessage = Message & { document_id: string }
type Store = { users: StoredUser[]; docs: StoredDoc[]; messages: StoredMessage[]; session: string | null }

const KEY = 'procjus-demo-v1'
const now = () => new Date().toISOString()
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2))
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // localStorage indisponível (aba anônima, bloqueio): segue com um estado em memória
  }
  return { users: [], docs: [], messages: [], session: null }
}

let memory: Store | null = null
function read(): Store {
  memory ??= load()
  return memory
}
function save(store: Store) {
  memory = store
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // sem persistência: a demo continua funcionando nesta aba
  }
}

function publicUser({ password: _password, ...user }: StoredUser): User {
  return user
}

function currentUser(store: Store): StoredUser {
  const user = store.users.find((u) => u.id === store.session)
  if (!user) throw new ApiError(401, 'Faça login para continuar.')
  return user
}

function summary({ owner: _owner, text: _text, analysis, error: _error, ...doc }: StoredDoc): DocumentSummary {
  return { ...doc, title: analysis?.titulo ?? null }
}

function ownedDoc(store: Store, id: string): StoredDoc {
  const user = currentUser(store)
  const doc = store.docs.find((d) => d.id === id && d.owner === user.id)
  if (!doc) throw new ApiError(404, 'Documento não encontrado.')
  return doc
}

/** Cada conta nova da demo já começa com os documentos de exemplo, prontos para explorar. */
function seedDocuments(store: Store, owner: string) {
  SAMPLES.forEach((s, i) => {
    store.docs.push({
      id: `${s.id}-${owner}`,
      owner,
      filename: s.filename,
      page_count: s.page_count,
      status: 'ready',
      title: s.analysis.titulo,
      error: null,
      text: s.text,
      analysis: s.analysis,
      created_at: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
    })
  })
}

function sampleFor(docId: string) {
  return SAMPLES.find((s) => docId.startsWith(s.id))
}

export const demoApi: Api = {
  async me() {
    return publicUser(currentUser(read()))
  },

  async register(name, email, password) {
    await wait(400)
    const store = read()
    const normalized = email.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new ApiError(422, 'Informe um e-mail válido.')
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      throw new ApiError(422, 'A senha precisa ter letras e números.')
    }
    if (store.users.some((u) => u.email === normalized)) {
      throw new ApiError(409, 'Já existe uma conta com este e-mail.')
    }
    const user: StoredUser = { id: uid(), name: name.trim(), email: normalized, password, created_at: now() }
    store.users.push(user)
    seedDocuments(store, user.id)
    store.session = user.id
    save(store)
    return publicUser(user)
  },

  async login(email, password) {
    await wait(400)
    const store = read()
    const user = store.users.find((u) => u.email === email.trim().toLowerCase() && u.password === password)
    if (!user) throw new ApiError(401, 'E-mail ou senha incorretos.')
    store.session = user.id
    save(store)
    return publicUser(user)
  },

  async logout() {
    const store = read()
    store.session = null
    save(store)
  },

  async listDocuments() {
    const store = read()
    const user = currentUser(store)
    return store.docs
      .filter((d) => d.owner === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map(summary)
  },

  async getDocument(id) {
    const { owner: _owner, ...doc } = ownedDoc(read(), id)
    return doc
  },

  async uploadDocument() {
    await wait(600)
    throw new ApiError(
      403,
      'Na demonstração não é possível enviar seus próprios documentos, porque não há servidor nem IA rodando. ' +
        'Abra um dos documentos de exemplo abaixo ou rode o projeto completo (instruções no GitHub).',
    )
  },

  async retryDocument(id) {
    return summary(ownedDoc(read(), id))
  },

  async deleteDocument(id) {
    const store = read()
    ownedDoc(store, id)
    store.docs = store.docs.filter((d) => d.id !== id)
    store.messages = store.messages.filter((m) => m.document_id !== id)
    save(store)
  },

  async listMessages(id) {
    const store = read()
    ownedDoc(store, id)
    return store.messages.filter((m) => m.document_id === id)
  },

  async sendMessage(id, content) {
    const store = read()
    ownedDoc(store, id)
    await wait(900 + Math.random() * 700) // simula o tempo de resposta da IA
    const reply = sampleFor(id)?.replies.find((r) => r.match.test(content))?.answer ?? FALLBACK_REPLY
    const askedAt = Date.now()
    const question: StoredMessage = { id: uid(), document_id: id, role: 'user', content, created_at: new Date(askedAt).toISOString() }
    const answer: StoredMessage = { id: uid(), document_id: id, role: 'assistant', content: reply, created_at: new Date(askedAt + 1).toISOString() }
    store.messages.push(question, answer)
    save(store)
    return [question, answer].map(({ document_id: _d, ...m }) => m)
  },
}
