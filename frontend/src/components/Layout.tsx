import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IS_DEMO } from '../api'
import { useAuth } from '../auth'

export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-bold tracking-tight text-brand-700 ${className}`}>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="size-8" />
      <span className="text-xl">
        Proc<span className="text-amber-500">Jus</span>
      </span>
    </Link>
  )
}

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link to="/app" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
                Meus documentos
              </Link>
              <span className="hidden text-slate-400 sm:inline" aria-hidden>
                |
              </span>
              <span className="hidden max-w-40 truncate text-slate-500 sm:inline">Olá, {user.name.split(' ')[0]}</span>
              <button
                onClick={async () => {
                  await logout()
                  navigate('/')
                }}
                className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link to="/entrar" className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100">
                Entrar
              </Link>
              <Link to="/cadastro" className="btn-primary">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {IS_DEMO && <DemoBanner />}
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        ProcJus explica documentos com ajuda de inteligência artificial e não substitui a orientação de um
        advogado ou da Defensoria Pública.
      </footer>
    </div>
  )
}

export function Disclaimer() {
  return (
    <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <span aria-hidden className="text-lg leading-none">⚖️</span>
      <p>
        {IS_DEMO
          ? 'Nesta demonstração, a explicação é um exemplo pré-escrito; na versão completa ela é gerada por inteligência artificial e pode conter erros. '
          : 'Esta explicação foi gerada por inteligência artificial para ajudar você a entender o documento. Ela pode conter erros. '}
        Ela <strong>não é uma orientação jurídica</strong>. Se houver prazo ou decisão a tomar, procure um advogado
        ou a <strong>Defensoria Pública</strong> (gratuita para quem não pode pagar).
      </p>
    </div>
  )
}

function DemoBanner() {
  return (
    <div className="bg-brand-900 px-4 py-2 text-center text-xs text-brand-100">
      <strong className="text-amber-300">Modo demonstração:</strong> documentos e respostas são exemplos fictícios
      pré-escritos, e seus dados ficam só neste navegador.{' '}
      <a href="https://github.com/LuizHenriquelhlt/ProcJus" className="font-semibold text-white underline">
        Ver o código e rodar com IA de verdade
      </a>
    </div>
  )
}
