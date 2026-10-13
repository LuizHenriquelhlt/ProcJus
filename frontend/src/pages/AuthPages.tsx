import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../auth'
import { Logo } from '../components/Layout'

function AuthShell({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4 py-12">
      <Logo className="mb-8" />
      <div className="card w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-brand-900">{title}</h1>
        <p className="mt-1 mb-6 text-sm text-slate-500">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

function Field({
  label,
  id,
  hint,
  ...props
}: { label: string; id: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input id={id} name={id} className="input" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  )
}

function useSubmit(action: () => Promise<void>) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  return { error, loading, onSubmit }
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {error}
    </p>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/app'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { error, loading, onSubmit } = useSubmit(async () => {
    await login(email, password)
    navigate(from, { replace: true })
  })

  if (user) return <Navigate to={from} replace />

  return (
    <AuthShell
      title="Entrar"
      subtitle={
        <>
          Não tem conta?{' '}
          <Link to="/cadastro" className="font-semibold text-brand-600 hover:underline">
            Cadastre-se grátis
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="E-mail" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Senha"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [accepted, setAccepted] = useState(false)
  const { error, loading, onSubmit } = useSubmit(async () => {
    if (password !== confirm) throw new ApiError(400, 'As senhas não são iguais.')
    await register(name, email, password)
    navigate('/app', { replace: true })
  })

  if (user) return <Navigate to="/app" replace />

  const strongEnough = password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password)

  return (
    <AuthShell
      title="Criar conta"
      subtitle={
        <>
          Já tem conta?{' '}
          <Link to="/entrar" className="font-semibold text-brand-600 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome" id="name" autoComplete="name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="E-mail" id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field
          label="Senha"
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          hint={strongEnough ? '✓ Senha válida' : 'Mínimo de 8 caracteres, com letras e números.'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirme a senha"
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-brand-600"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
          />
          Entendo que o ProcJus usa inteligência artificial para explicar documentos e não substitui um advogado.
        </label>
        <ErrorBox error={error} />
        <button type="submit" className="btn-primary w-full" disabled={loading || !accepted}>
          {loading ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>
    </AuthShell>
  )
}
