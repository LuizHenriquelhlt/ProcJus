import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, type Analysis, type DocumentDetail } from '../api'
import { ChatPanel } from '../components/ChatPanel'
import { GlossaryText } from '../components/GlossaryText'
import { Disclaimer, Page } from '../components/Layout'
import { StatusBadge } from './Dashboard'

const POLL_MS = 2500

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="card">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
        <span aria-hidden>{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  )
}

function Explanation({ a }: { a: Analysis }) {
  const g = a.glossario
  return (
    <div className="space-y-5">
      <Disclaimer />

      <Section title="Em poucas palavras" icon="🧭">
        <div className="space-y-3 leading-relaxed text-slate-700">
          {a.resumo_simples.split(/\n+/).map((p, i) => (
            <p key={i}>
              <GlossaryText text={p} glossary={g} />
            </p>
          ))}
        </div>
      </Section>

      {a.prazos.length > 0 && (
        <section className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-red-900">
            <span aria-hidden>⏰</span> Prazos importantes
          </h3>
          <ul className="space-y-2">
            {a.prazos.map((p, i) => (
              <li key={i} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                <span className="shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-sm font-bold text-white">{p.prazo}</span>
                <span className="text-red-900">{p.descricao}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.decisao && (
        <Section title="O que foi decidido ou pedido" icon="⚖️">
          <p className="leading-relaxed text-slate-700">
            <GlossaryText text={a.decisao} glossary={g} />
          </p>
        </Section>
      )}

      {a.partes.length > 0 && (
        <Section title="Quem é quem" icon="👥">
          <dl className="grid gap-3 sm:grid-cols-2">
            {a.partes.map((p, i) => (
              <div key={i} className="rounded-xl bg-slate-50 p-3">
                <dt className="font-medium text-slate-900">{p.nome}</dt>
                <dd className="text-sm text-slate-600">{p.papel}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {a.pontos_principais.length > 0 && (
        <Section title="Pontos principais" icon="📌">
          <ul className="list-disc space-y-1.5 pl-5 text-slate-700">
            {a.pontos_principais.map((p, i) => (
              <li key={i}>
                <GlossaryText text={p} glossary={g} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {a.proximos_passos.length > 0 && (
        <Section title="E agora, o que fazer?" icon="👣">
          <ol className="space-y-2">
            {a.proximos_passos.map((p, i) => (
              <li key={i} className="flex gap-3 text-slate-700">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {g.length > 0 && (
        <Section title="Glossário" icon="📖">
          <dl className="divide-y divide-slate-100">
            {g.map((t) => (
              <div key={t.termo} className="py-2.5">
                <dt className="font-medium text-amber-700">{t.termo}</dt>
                <dd className="text-sm text-slate-600">{t.explicacao}</dd>
              </div>
            ))}
          </dl>
        </Section>
      )}
    </div>
  )
}

export function DocumentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<DocumentDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [tab, setTab] = useState<'explicacao' | 'original'>('explicacao')

  // Enquanto a IA analisa, consulta o status periodicamente.
  useEffect(() => {
    let timer: number | undefined
    let cancelled = false
    async function load() {
      try {
        const d = await api.getDocument(id)
        if (cancelled) return
        setDoc(d)
        if (d.status === 'processing') timer = window.setTimeout(load, POLL_MS)
      } catch (e) {
        if (!cancelled && e instanceof ApiError && e.status === 404) setNotFound(true)
      }
    }
    load()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [id, doc?.status])

  async function remove() {
    if (!confirm('Apagar este documento e a conversa? Essa ação não pode ser desfeita.')) return
    await api.deleteDocument(id)
    navigate('/app')
  }

  async function retry() {
    await api.retryDocument(id)
    setDoc((d) => (d ? { ...d, status: 'processing', error: null } : d))
  }

  if (notFound) {
    return (
      <Page>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-xl font-bold text-slate-900">Documento não encontrado</h1>
          <Link to="/app" className="btn-primary mt-6">
            Voltar para meus documentos
          </Link>
        </div>
      </Page>
    )
  }

  return (
    <Page>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/app" className="text-sm font-medium text-brand-600 hover:underline">
          ← Meus documentos
        </Link>

        {!doc ? (
          <p className="mt-8 text-slate-500">Carregando…</p>
        ) : (
          <>
            <div className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold text-brand-900">{doc.analysis?.titulo ?? doc.filename}</h1>
                  <StatusBadge status={doc.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {doc.analysis?.tipo_documento && <>{doc.analysis.tipo_documento} · </>}
                  {doc.filename} · {doc.page_count} {doc.page_count === 1 ? 'página' : 'páginas'}
                </p>
              </div>
              <button onClick={remove} className="btn-secondary text-red-600 hover:bg-red-50">
                Apagar
              </button>
            </div>

            {doc.status === 'processing' && (
              <div className="card flex flex-col items-center py-16 text-center" role="status">
                <div className="mb-4 size-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
                <p className="font-semibold text-slate-800">Traduzindo o juridiquês…</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">
                  Estamos lendo o documento com calma. Documentos longos podem levar até um minuto.
                </p>
              </div>
            )}

            {doc.status === 'error' && (
              <div className="card border-red-200 bg-red-50 text-center">
                <p className="font-semibold text-red-800">Não conseguimos analisar este documento.</p>
                {doc.error && <p className="mt-1 text-sm text-red-700">{doc.error}</p>}
                <button onClick={retry} className="btn-primary mt-4">
                  Tentar novamente
                </button>
              </div>
            )}

            {doc.status === 'ready' && doc.analysis && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                <div>
                  <div role="tablist" className="mb-5 inline-flex rounded-xl bg-slate-200/70 p-1 text-sm font-medium">
                    {(
                      [
                        ['explicacao', 'Explicação simples'],
                        ['original', 'Texto original'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`rounded-lg px-4 py-2 transition ${
                          tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {tab === 'explicacao' ? (
                    <Explanation a={doc.analysis} />
                  ) : (
                    <div className="card">
                      <p className="mb-4 text-sm text-slate-500">
                        Passe o mouse sobre os <span className="term">termos destacados</span> para ver o que significam.
                      </p>
                      <div className="font-serif leading-relaxed whitespace-pre-line text-slate-700">
                        <GlossaryText text={doc.text} glossary={doc.analysis.glossario} />
                      </div>
                    </div>
                  )}
                </div>

                <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
                  <ChatPanel documentId={doc.id} />
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </Page>
  )
}
