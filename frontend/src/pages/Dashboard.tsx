import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, ApiError, type DocumentSummary } from '../api'
import { useAuth } from '../auth'
import { Page } from '../components/Layout'

const MAX_MB = 10

export function StatusBadge({ status }: { status: DocumentSummary['status'] }) {
  const styles = {
    processing: 'bg-amber-100 text-amber-800',
    ready: 'bg-emerald-100 text-emerald-800',
    error: 'bg-red-100 text-red-700',
  }[status]
  const label = { processing: 'Analisando…', ready: 'Pronto', error: 'Erro' }[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles}`}>{label}</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function UploadBox() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handle(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Envie um arquivo em PDF.')
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`O arquivo tem mais de ${MAX_MB} MB.`)
      return
    }
    setUploading(true)
    try {
      const doc = await api.uploadDocument(file)
      navigate(`/app/documentos/${doc.id}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Não foi possível enviar o arquivo.')
      setUploading(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handle(e.dataTransfer.files[0])
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={uploading}
        className={`flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-200 hover:bg-brand-50/50'
        }`}
      >
        {uploading ? (
          <>
            <div className="mb-3 size-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
            <p className="font-semibold text-slate-700">Lendo o documento…</p>
          </>
        ) : (
          <>
            <span className="mb-3 text-4xl" aria-hidden>
              📄
            </span>
            <p className="font-semibold text-slate-800">Arraste o PDF aqui ou clique para escolher</p>
            <p className="mt-1 text-sm text-slate-500">Sentenças, intimações, contratos, petições… até {MAX_MB} MB</p>
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const [docs, setDocs] = useState<DocumentSummary[] | null>(null)

  useEffect(() => {
    api.listDocuments().then(setDocs).catch(() => setDocs([]))
  }, [])

  return (
    <Page>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-brand-900">Olá, {user?.name.split(' ')[0]} 👋</h1>
        <p className="mt-1 text-slate-600">Envie um documento e a gente explica o que ele quer dizer.</p>

        <div className="mt-6">
          <UploadBox />
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Meus documentos</h2>
          {docs === null ? (
            <p className="text-sm text-slate-500">Carregando…</p>
          ) : docs.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              Você ainda não enviou nenhum documento.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {docs.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/app/documentos/${d.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{d.title ?? d.filename}</p>
                      <p className="truncate text-xs text-slate-500">
                        {d.filename} · {d.page_count} {d.page_count === 1 ? 'página' : 'páginas'} · {formatDate(d.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Page>
  )
}
