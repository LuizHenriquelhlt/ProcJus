import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError, type Message } from '../api'

const SUGGESTIONS = [
  'Eu preciso fazer alguma coisa agora?',
  'Tenho que pagar algum valor?',
  'Qual é o prazo e quando ele termina?',
  'O que acontece se eu não fizer nada?',
]

export function ChatPanel({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.listMessages(documentId).then(setMessages).catch(() => undefined)
  }, [documentId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, sending])

  async function send(content: string) {
    const text = content.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    setInput('')
    // Mostra a pergunta na hora, antes da resposta chegar.
    const optimistic: Message = { id: 'pending', role: 'user', content: text, created_at: new Date().toISOString() }
    setMessages((m) => [...m, optimistic])
    try {
      const saved = await api.sendMessage(documentId, text)
      setMessages((m) => [...m.filter((x) => x.id !== 'pending'), ...saved])
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== 'pending'))
      setInput(text)
      setError(e instanceof ApiError ? e.message : 'Não foi possível enviar.')
    } finally {
      setSending(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  return (
    <section className="flex h-full min-h-[28rem] flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Tire suas dúvidas</h2>
        <p className="text-sm text-slate-500">Pergunte qualquer coisa sobre este documento, com suas palavras.</p>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" aria-live="polite">
        {messages.length === 0 && !sending && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Sugestões para começar:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="block w-full rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5 text-left text-sm text-brand-700 transition hover:border-brand-200 hover:bg-brand-100"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={
                m.role === 'user'
                  ? 'max-w-[85%] rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-sm text-white'
                  : 'max-w-[85%] whitespace-pre-line rounded-2xl rounded-bl-md bg-slate-100 px-4 py-2.5 text-sm leading-relaxed text-slate-800'
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start" role="status">
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3">
              {[0, 150, 300].map((d) => (
                <span key={d} className="size-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />
              ))}
              <span className="sr-only">Escrevendo resposta…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-slate-100 p-3">
        <label htmlFor="chat-input" className="sr-only">
          Sua pergunta
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Ex.: o que significa “intime-se”?"
          className="input flex-1"
          disabled={sending}
        />
        <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
          Enviar
        </button>
      </form>
    </section>
  )
}
