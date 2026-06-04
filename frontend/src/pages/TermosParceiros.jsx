import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { ArrowLeft, Store, DollarSign, Star, AlertTriangle, FileText } from 'lucide-react'

const secoes = [
  {
    icone: Store,
    titulo: '1. Adesão à Plataforma',
    texto: `Ao se cadastrar como parceiro da FoodExpress, seja estabelecimento, mercado, restaurante, gerente responsável ou entregador, você concorda com estes Termos para Parceiros e com a Política de Privacidade. O cadastro pode passar por validação técnica, documental, operacional ou de segurança antes ou depois da ativação. Podemos suspender ou cancelar contas que não atendam aos critérios de qualidade, legalidade, segurança ou conformidade.`,
  },
  {
    icone: DollarSign,
    titulo: '2. Comissão e Repasses',
    texto: `Comissões, taxas, promoções, descontos, repasses e prazos de pagamento podem variar conforme tipo de parceiro, plano comercial, meio de pagamento, status do pedido e acordos vigentes. Pedidos cancelados, estornados, disputados, fraudulentos ou não concluídos podem ser retidos, descontados ou analisados antes do repasse. Valores de entregadores são calculados conforme a regra exibida no painel ou definida operacionalmente.`,
  },
  {
    icone: FileText,
    titulo: '3. Cardápio e Informações',
    texto: `Estabelecimentos são responsáveis por manter cardápio, preços, fotos, descrições, ingredientes, disponibilidade, promoções, horários, endereço e dados de contato corretos. Informações falsas, enganosas, incompletas ou desatualizadas podem gerar reclamações, reembolsos, suspensão do item, suspensão da loja ou outras medidas cabíveis.`,
  },
  {
    icone: Star,
    titulo: '4. Qualidade e Padrões',
    texto: `Parceiros devem cumprir boas práticas de atendimento, higiene, segurança, pontualidade, comunicação e respeito aos usuários. Estabelecimentos devem observar normas sanitárias, licenças e regras aplicáveis ao seu ramo. Entregadores devem manter conduta segura, respeitosa, cumprir rotas combinadas e atualizar corretamente o status das entregas.`,
  },
  {
    icone: AlertTriangle,
    titulo: '5. Disputas e Reclamações',
    texto: `O parceiro deve cooperar na análise de reclamações, denúncias, disputas e solicitações de suporte. A FoodExpress pode solicitar evidências, respostas internas, ajustes de produto, correção de informações, reembolso, estorno, desconto em repasse ou outras medidas proporcionais quando houver falha operacional, divergência no pedido, atraso relevante, produto incorreto, má conduta ou suspeita de fraude.`,
  },
  {
    icone: AlertTriangle,
    titulo: '6. Suspensão e Encerramento',
    texto: `A FoodExpress pode limitar, pausar, suspender ou encerrar contas em caso de violação destes Termos, descumprimento legal, fraude, manipulação de avaliações, uso indevido de dados, reclamações graves, risco à segurança, inatividade, dados falsos, baixa qualidade operacional ou conduta que prejudique usuários, parceiros ou a plataforma.`,
  },
  {
    icone: DollarSign,
    titulo: '7. Uso da Marca FoodExpress',
    texto: `O parceiro pode utilizar a marca FoodExpress apenas para divulgar sua participação na plataforma, quando autorizado e conforme diretrizes fornecidas. O parceiro concede à FoodExpress permissão para exibir nome, logotipo, fotos, cardápio, avaliação e informações comerciais necessárias à operação da loja ou do perfil durante a vigência da parceria.`,
  },
  {
    icone: FileText,
    titulo: '8. Dados e Relatórios',
    texto: `A FoodExpress coleta e processa dados de pedidos, avaliações e desempenho do parceiro para fins operacionais e de melhoria do serviço. Os dados agregados podem ser usados em relatórios e análises internas. Dados identificados do parceiro não são compartilhados com terceiros sem consentimento, exceto por exigência legal. O parceiro tem acesso aos seus próprios relatórios de desempenho via painel.`,
  },
]

export default function TermosParceiros() {
  const navigate = useNavigate()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center hover:bg-secondary/10 hover:border-secondary/30 transition-colors"
          >
            <ArrowLeft size={16} className="text-text-primary" />
          </button>
          <div className="flex items-center gap-2">
            <Store size={18} className="text-secondary" />
            <h1 className="font-display text-lg font-extrabold text-text-primary">Termos para Parceiros</h1>
          </div>
          <span className="ml-auto text-xs text-text-muted font-semibold">Atualizado em jun/2026</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Intro */}
        <Motion.div
          className="bg-secondary/8 border border-secondary/20 rounded-2xl p-6 mb-8 flex gap-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <Store size={22} className="text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-bold text-text-primary mb-1">Para restaurantes e estabelecimentos parceiros</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              Estes termos regem a relação comercial entre a FoodExpress e os estabelecimentos cadastrados como parceiros na plataforma. Leia com atenção antes de concluir seu cadastro.
            </p>
          </div>
        </Motion.div>

        {/* Destaque comissão */}
        <Motion.div
          className="grid grid-cols-3 gap-4 mb-8"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
              {[
            { label: 'Taxas', valor: 'Variável', desc: 'por plano ou acordo' },
            { label: 'Repasse', valor: 'Painel', desc: 'conforme status' },
            { label: 'Qualidade', valor: 'Contínua', desc: 'pedidos e avaliações' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl border border-border p-4 text-center shadow-sm">
              <p className="font-display text-xl font-extrabold text-secondary">{item.valor}</p>
              <p className="text-xs font-extrabold text-text-primary mt-0.5">{item.label}</p>
              <p className="text-xs text-text-muted">{item.desc}</p>
            </div>
          ))}
        </Motion.div>

        {/* Seções */}
        <div className="flex flex-col gap-6">
          {secoes.map((s, i) => {
            const Icone = s.icone
            return (
              <Motion.div
                key={s.titulo}
                className="bg-white rounded-2xl border border-border p-6 shadow-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                    <Icone size={15} className="text-secondary" />
                  </div>
                  <h2 className="font-display text-base font-extrabold text-text-primary">{s.titulo}</h2>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">{s.texto}</p>
              </Motion.div>
            )
          })}
        </div>

        {/* Footer */}
        <Motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-text-muted mb-4">
            Dúvidas comerciais:{' '}
            <a href="mailto:vdasilvasouza77@gmail.com" className="text-secondary font-bold hover:underline">
              vdasilvasouza77@gmail.com
            </a>
          </p>
          <Link
            to="/politica-privacidade"
            className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:opacity-80 transition-opacity"
          >
            Ver Política de Privacidade →
          </Link>
        </Motion.div>
      </main>
    </div>
  )
}
