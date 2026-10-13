import { useMemo, type ReactNode } from 'react'
import type { GlossaryTerm } from '../api'

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '')

// PDFs às vezes perdem acentos na extração ("transito" em vez de "trânsito"): cada letra
// do termo aceita suas variantes acentuadas, sem alterar as posições no texto original.
const VARIANTS: Record<string, string> = {
  a: 'aáàâãä',
  e: 'eéèêë',
  i: 'iíìîï',
  o: 'oóòôõö',
  u: 'uúùûü',
  c: 'cç',
}

function termPattern(term: string) {
  return [...stripAccents(term)]
    .map((ch) => {
      const v = VARIANTS[ch.toLowerCase()]
      return v ? `[${v}]` : escapeRegExp(ch)
    })
    .join('')
    .replace(/\s+/g, '\\s+') // quebras de linha do PDF no meio do termo
}

/** Destaca os termos do glossário no texto; passar o mouse (ou focar com Tab) mostra a explicação. */
export function GlossaryText({ text, glossary }: { text: string; glossary: GlossaryTerm[] }) {
  const parts = useMemo(() => {
    const terms = glossary.filter((g) => g.termo.trim().length > 1)
    if (terms.length === 0) return [text]

    const key = (s: string) => stripAccents(s).toLowerCase().replace(/\s+/g, ' ')
    const byKey = new Map(terms.map((g) => [key(g.termo), g]))
    // Termos mais longos primeiro, para "trânsito em julgado" ganhar de "julgado".
    const pattern = [...terms]
      .sort((a, b) => b.termo.length - a.termo.length)
      .map((g) => termPattern(g.termo))
      .join('|')
    // Limites de palavra que consideram letras acentuadas (\b do JS não considera).
    const regex = new RegExp(`(?<![\\p{L}\\p{N}])(${pattern})(?![\\p{L}\\p{N}])`, 'giu')

    const out: ReactNode[] = []
    let last = 0
    for (const match of text.matchAll(regex)) {
      const start = match.index ?? 0
      if (start > last) out.push(text.slice(last, start))
      const term = byKey.get(key(match[0]))
      out.push(
        <span key={start} className="term" tabIndex={0} aria-label={`${match[0]}: ${term?.explicacao ?? ''}`}>
          {match[0]}
          <span className="term-tip" role="tooltip">
            <strong className="mb-1 block text-amber-300">{term?.termo}</strong>
            {term?.explicacao}
          </span>
        </span>,
      )
      last = start + match[0].length
    }
    if (last < text.length) out.push(text.slice(last))
    return out
  }, [text, glossary])

  return <>{parts}</>
}
