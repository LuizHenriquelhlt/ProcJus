import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Page } from '../components/Layout'

const BEFORE =
  'Julgo procedente o pedido para condenar o réu ao pagamento de R$ 5.000,00 a título de danos morais. Após o trânsito em julgado, intime-se para pagamento no prazo de 15 dias, sob pena de multa de 10%.'
const AFTER =
  'O juiz deu razão a quem entrou com o processo. Quem foi processado vai ter que pagar R$ 5.000,00 como indenização. Quando não couber mais recurso, essa pessoa será avisada e terá 15 dias para pagar. Se atrasar, o valor aumenta 10%.'

const STEPS = [
  { icon: '📄', title: 'Envie o PDF', text: 'Sentença, intimação, contrato, petição: qualquer documento jurídico em PDF.' },
  { icon: '🧭', title: 'Receba a tradução', text: 'Resumo simples, quem é quem, o que foi decidido, prazos e próximos passos.' },
  { icon: '💬', title: 'Pergunte o que quiser', text: 'Converse sobre o documento, com suas palavras, como faria com um amigo.' },
]

export function Landing() {
  const { user } = useAuth()
  const cta = user ? '/app' : '/cadastro'

  return (
    <Page>
      <section className="bg-gradient-to-b from-brand-50 to-slate-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-wide text-amber-800 uppercase">
              Juridiquês → português
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-brand-900 md:text-5xl">
              Entenda seus documentos jurídicos sem precisar de dicionário.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              O ProcJus lê o documento e explica, em linguagem simples, o que ele diz, o que significa para você e o que
              fazer em seguida.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="btn-primary px-6 py-3 text-base">
                {user ? 'Ir para meus documentos' : 'Começar grátis'}
              </Link>
              {!user && (
                <Link to="/entrar" className="btn-secondary px-6 py-3 text-base">
                  Já tenho conta
                </Link>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <figure className="card border-slate-300 bg-slate-100/80">
              <figcaption className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                O que está escrito
              </figcaption>
              <blockquote className="font-serif text-slate-700 italic">“{BEFORE}”</blockquote>
            </figure>
            <figure className="card border-brand-200 ring-4 ring-brand-100">
              <figcaption className="mb-2 text-xs font-semibold tracking-wide text-brand-600 uppercase">
                O que isso quer dizer
              </figcaption>
              <p className="text-slate-800">{AFTER}</p>
            </figure>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-brand-900">Como funciona</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="card">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <span className="text-sm font-semibold text-brand-500">Passo {i + 1}</span>
              </div>
              <h3 className="font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl bg-brand-900 p-8 text-center text-brand-50">
          <h2 className="text-xl font-bold text-white">Seus documentos, sua privacidade</h2>
          <p className="mt-2 text-sm text-brand-200">
            O arquivo PDF é descartado logo após a leitura: guardamos apenas o texto, na sua conta, protegida por senha. Você
            pode apagar qualquer documento a qualquer momento.
          </p>
        </div>
      </section>
    </Page>
  )
}
