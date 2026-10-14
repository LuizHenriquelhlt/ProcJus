import type { Analysis } from '../api'

// Documentos e análises FICTÍCIOS, escritos à mão para a demonstração (sem IA, sem dados reais).

export type Sample = {
  id: string
  filename: string
  page_count: number
  text: string
  analysis: Analysis
  replies: { match: RegExp; answer: string }[]
}

const SENTENCA_TEXT = `PODER JUDICIÁRIO
JUIZADO ESPECIAL CÍVEL - BRASÍLIA/DF
Processo nº 0700000-00.2026.8.07.0016 (exemplo fictício)
Autor: João da Silva
Réu: Banco Exemplo S.A.

SENTENÇA

Trata-se de ação de indenização por danos morais ajuizada por João da Silva em face de Banco Exemplo S.A., em razão da inscrição indevida do nome do autor em cadastro de inadimplentes.

O réu não comprovou a existência da dívida que originou a negativação, ônus que lhe competia (art. 373, II, do CPC).

Ante o exposto, JULGO PROCEDENTE o pedido para condenar o réu ao pagamento de R$ 5.000,00 (cinco mil reais) a título de danos morais, corrigidos monetariamente e acrescidos de juros de mora. Determino, ainda, a exclusão do nome do autor dos cadastros de inadimplentes no prazo de 5 dias, sob pena de multa diária.

Após o trânsito em julgado, intime-se o réu para pagamento no prazo de 15 dias, sob pena de multa de 10% (art. 523, §1º, do CPC).

Sem custas e honorários (art. 55 da Lei 9.099/95).

Brasília, 6 de outubro de 2026.
Juiz(a) de Direito`

const SENTENCA: Sample = {
  id: 'demo-sentenca',
  filename: 'sentenca-joao-x-banco.pdf',
  page_count: 2,
  text: SENTENCA_TEXT,
  analysis: {
    titulo: 'Sentença: banco condenado a pagar indenização de R$ 5.000',
    tipo_documento: 'Sentença (decisão do juiz)',
    resumo_simples:
      'O juiz analisou o processo que João da Silva abriu contra o Banco Exemplo e deu razão ao João. O banco colocou o nome dele na lista de "nome sujo" sem conseguir provar que existia uma dívida.\n' +
      'Por isso, o banco foi condenado a pagar R$ 5.000,00 a ele como indenização por danos morais, ou seja, pelo constrangimento causado. O banco também tem 5 dias para tirar o nome do João dessa lista, ou paga multa por dia de atraso.\n' +
      'O pagamento dos R$ 5.000 não é imediato: primeiro a decisão precisa virar definitiva (o trânsito em julgado). Depois disso, o banco será avisado e terá 15 dias para pagar.',
    partes: [
      { nome: 'João da Silva', papel: 'Quem entrou com o processo (autor) e ganhou a causa' },
      { nome: 'Banco Exemplo S.A.', papel: 'Quem foi processado (réu) e terá que pagar' },
    ],
    pontos_principais: [
      'O pedido do João foi aceito: o juiz julgou procedente o pedido.',
      'O banco não provou que a dívida existia, então a negativação foi considerada errada.',
      'O valor da indenização é de R$ 5.000,00, com correção e juros.',
      'Como o processo correu no Juizado Especial, ninguém paga custas nem honorários nesta fase.',
    ],
    decisao:
      'O juiz julgou procedente o pedido: o banco deve pagar R$ 5.000,00 de danos morais e retirar o nome do João dos cadastros de inadimplentes.',
    prazos: [
      { descricao: 'Para o banco tirar o nome do João da lista de inadimplentes', prazo: '5 dias' },
      { descricao: 'Para o banco pagar, contado do aviso oficial depois que a decisão virar definitiva', prazo: '15 dias' },
      { descricao: 'Acréscimo se o banco não pagar no prazo', prazo: 'multa de 10%' },
    ],
    proximos_passos: [
      'Guarde este documento: ele é a prova de que você ganhou a causa.',
      'Confira daqui a alguns dias se seu nome já saiu dos cadastros de inadimplentes (Serasa, SPC).',
      'Acompanhe se o banco vai recorrer. Se recorrer, a decisão demora mais para virar definitiva.',
      'Se o banco não pagar em 15 dias depois de avisado, procure um advogado ou a Defensoria Pública para cobrar o valor com a multa.',
    ],
    glossario: [
      { termo: 'JULGO PROCEDENTE', explicacao: 'O juiz concordou com o pedido de quem abriu o processo.' },
      { termo: 'Réu', explicacao: 'A pessoa ou empresa que está sendo processada.' },
      { termo: 'danos morais', explicacao: 'Indenização pelo sofrimento, vergonha ou transtorno causado a alguém.' },
      { termo: 'cadastros de inadimplentes', explicacao: 'Listas como Serasa e SPC, onde fica o "nome sujo" de quem deve.' },
      { termo: 'juros de mora', explicacao: 'Valor extra cobrado pelo atraso no pagamento.' },
      { termo: 'trânsito em julgado', explicacao: 'Quando a decisão vira definitiva e não cabe mais recurso.' },
      { termo: 'intime-se', explicacao: 'Ordem para avisar oficialmente a pessoa sobre a decisão.' },
      { termo: 'ônus', explicacao: 'Obrigação de provar algo no processo.' },
      { termo: 'honorários', explicacao: 'Pagamento devido aos advogados.' },
    ],
  },
  replies: [
    {
      match: /quando|cair|receb|dinheiro|data/i,
      answer:
        'Ainda não há uma data exata. Primeiro a decisão precisa virar definitiva, o que só acontece quando não couber mais recurso. Depois disso, o banco será avisado e terá 15 dias para pagar.\n\nSe o banco recorrer, esse caminho pode levar alguns meses. Um advogado ou a Defensoria Pública consegue acompanhar o processo e avisar quando o prazo começar a contar.',
    },
    {
      match: /pagar|valor|quanto|custa/i,
      answer:
        'Você não precisa pagar nada. Quem foi condenado a pagar é o banco: R$ 5.000,00, com correção e juros. Como o processo é do Juizado Especial, nesta fase também não há custas nem honorários para você.',
    },
    {
      match: /recurso|recorrer|apela/i,
      answer:
        'O banco ainda pode recorrer, ou seja, pedir que outros juízes revisem a decisão. No Juizado Especial, o prazo para isso costuma ser de 10 dias depois que as partes são avisadas da sentença. O documento não diz se o banco já recorreu. Isso aparece no andamento do processo.',
    },
    {
      match: /nome|serasa|spc|sujo|negativ/i,
      answer:
        'O juiz mandou o banco tirar seu nome dos cadastros de inadimplentes em 5 dias. Se não tirar, o banco paga uma multa por dia de atraso. Vale consultar o Serasa ou o SPC depois desse prazo para confirmar.',
    },
  ],
}

const MANDADO_TEXT = `PODER JUDICIÁRIO
TRIBUNAL DE JUSTIÇA - 3ª VARA CÍVEL (exemplo fictício)
Processo nº 0712345-00.2026.8.07.0001
Autor: Imobiliária Modelo Ltda.
Ré: Maria Oliveira

MANDADO DE CITAÇÃO E INTIMAÇÃO

O(A) Juiz(a) de Direito da 3ª Vara Cível MANDA que o Oficial de Justiça proceda à CITAÇÃO de MARIA OLIVEIRA, para que tome ciência da ação de cobrança de aluguéis atrasados no valor de R$ 7.200,00 movida por Imobiliária Modelo Ltda., e INTIME-A para comparecer à audiência de conciliação designada para 10/11/2026, às 14h, acompanhada de advogado ou defensor público (art. 334 do CPC).

O prazo para contestação, de 15 (quinze) dias úteis, terá início a partir da audiência, caso não haja autocomposição (art. 335, I, do CPC). Não sendo contestada a ação, ocorrerá a revelia, presumindo-se verdadeiras as alegações de fato formuladas pelo autor (art. 344 do CPC).

O não comparecimento injustificado à audiência de conciliação é considerado ato atentatório à dignidade da justiça e será sancionado com multa (art. 334, §8º, do CPC).

Cumpra-se.`

const MANDADO: Sample = {
  id: 'demo-mandado',
  filename: 'mandado-citacao-maria.pdf',
  page_count: 1,
  text: MANDADO_TEXT,
  analysis: {
    titulo: 'Você está sendo processada por aluguel atrasado e tem uma audiência marcada',
    tipo_documento: 'Mandado de citação e intimação',
    resumo_simples:
      'Este documento avisa oficialmente a Maria Oliveira de que a Imobiliária Modelo entrou com um processo contra ela, cobrando R$ 7.200,00 de aluguéis atrasados.\n' +
      'Maria foi chamada para uma audiência de conciliação no dia 10/11/2026, às 14h. É uma reunião para tentar um acordo antes de o processo seguir. Ela deve ir acompanhada de advogado ou da Defensoria Pública.\n' +
      'Se não houver acordo, ela terá 15 dias úteis, contados a partir da audiência, para apresentar sua defesa. Se não se defender, o juiz pode considerar verdadeiro tudo o que a imobiliária disse.',
    partes: [
      { nome: 'Imobiliária Modelo Ltda.', papel: 'Quem está cobrando (autora do processo)' },
      { nome: 'Maria Oliveira', papel: 'Quem está sendo cobrada (ré)' },
    ],
    pontos_principais: [
      'É um processo de cobrança de R$ 7.200,00 em aluguéis atrasados.',
      'Existe uma audiência de conciliação marcada, com data e hora.',
      'Faltar à audiência sem justificativa gera multa.',
      'Não se defender no prazo leva à revelia: o juiz tende a aceitar a versão da imobiliária.',
    ],
    decisao: null,
    prazos: [
      { descricao: 'Audiência de conciliação (comparecimento obrigatório)', prazo: '10/11/2026 às 14h' },
      { descricao: 'Para apresentar a defesa (contestação), contados da audiência se não houver acordo', prazo: '15 dias úteis' },
    ],
    proximos_passos: [
      'Anote a data da audiência: 10/11/2026, às 14h.',
      'Procure agora um advogado ou a Defensoria Pública (gratuita para quem não pode pagar) e leve este documento.',
      'Separe comprovantes de pagamento, o contrato de aluguel e mensagens com a imobiliária.',
      'Pense se aceita um acordo, como parcelar a dívida. A audiência é o momento de negociar.',
    ],
    glossario: [
      { termo: 'CITAÇÃO', explicacao: 'O aviso oficial de que existe um processo contra você.' },
      { termo: 'INTIME-A', explicacao: 'Ordem para avisar a pessoa de que ela precisa fazer algo, como ir a uma audiência.' },
      { termo: 'audiência de conciliação', explicacao: 'Reunião no fórum para tentar um acordo antes do julgamento.' },
      { termo: 'contestação', explicacao: 'A defesa escrita de quem está sendo processado.' },
      { termo: 'autocomposição', explicacao: 'Acordo feito entre as próprias partes.' },
      { termo: 'revelia', explicacao: 'Quando a pessoa processada não se defende; o juiz pode aceitar a versão do outro lado.' },
      { termo: 'ato atentatório à dignidade da justiça', explicacao: 'Comportamento que desrespeita o processo e pode gerar multa.' },
      { termo: 'defensor público', explicacao: 'Advogado do Estado que atende de graça quem não pode pagar.' },
    ],
  },
  replies: [
    {
      match: /faltar|não for|nao for|não ir|nao ir|audi/i,
      answer:
        'A audiência é obrigatória. Se você faltar sem uma justificativa aceita pelo juiz, recebe uma multa. Além disso, perde a chance de negociar um acordo. Se não puder ir, procure um advogado ou a Defensoria Pública antes da data para avisar o juízo.',
    },
    {
      match: /advogad|defensor|pagar advogado|dinheiro/i,
      answer:
        'Se você não pode pagar um advogado, a Defensoria Pública atende de graça. Procure a unidade mais próxima com este documento, seus documentos pessoais e um comprovante de renda. Vá o quanto antes, porque a audiência já tem data.',
    },
    {
      match: /prazo|quando|dias|defesa|contest/i,
      answer:
        'São duas datas importantes. A audiência é em 10/11/2026, às 14h. Se não houver acordo nela, você tem 15 dias úteis, contados a partir da audiência, para apresentar sua defesa (a contestação). Dias úteis não incluem sábados, domingos e feriados.',
    },
    {
      match: /acordo|parcel|negoci/i,
      answer:
        'Sim, a audiência existe justamente para isso. Você pode propor, por exemplo, parcelar os R$ 7.200,00. Se as duas partes concordarem, o acordo é registrado e o processo termina. Vale chegar com uma proposta que caiba no seu bolso.',
    },
  ],
}

export const SAMPLES: Sample[] = [MANDADO, SENTENCA]

export const FALLBACK_REPLY =
  'Esta é a versão de demonstração: as respostas do chat são pré-escritas para algumas perguntas comuns (prazos, valores, audiência, recurso, acordo). ' +
  'Na versão completa, uma IA lê o documento inteiro e responde qualquer pergunta. Veja no README como rodar o projeto com uma chave gratuita.'
