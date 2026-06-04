import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion as Motion } from 'framer-motion'
import { ArrowLeft, Shield, FileText } from 'lucide-react'

const secoes = [
  {
    titulo: '1. Aceitação dos Termos',
    texto: `Ao se cadastrar e utilizar a plataforma FoodExpress, você concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição, solicitamos que não utilize nossos serviços. O uso contínuo da plataforma após alterações nos Termos constitui aceitação das modificações.`,
  },
  {
    titulo: '2. Descrição do Serviço',
    texto: `A FoodExpress é uma plataforma de intermediação entre clientes, restaurantes, mercados, estabelecimentos parceiros e entregadores. Facilitamos busca, pedidos, pagamento, acompanhamento de entrega, suporte, avaliações e comunicação entre as partes. O preparo dos produtos é responsabilidade do estabelecimento parceiro e a entrega é executada pelo entregador vinculado ao pedido ou pelo próprio parceiro, conforme o fluxo disponível.`,
  },
  {
    titulo: '3. Cadastro e Conta',
    texto: `Para utilizar os serviços, você deve fornecer informações verdadeiras, completas e atualizadas, incluindo nome, telefone, e-mail, senha e endereço de entrega quando necessário. Você é responsável pela segurança da sua senha e pelas atividades realizadas na sua conta. Podemos impedir ou suspender cadastros com dados falsos, duplicados, abusivos ou que violem estes Termos.`,
  },
  {
    titulo: '4. Uso Aceitável',
    texto: `Você concorda em não utilizar a plataforma para fins ilegais, fraudulentos ou prejudiciais a terceiros. É proibido: fazer pedidos com intenção de não pagamento; fornecer endereços falsos; assediar entregadores ou atendentes; tentar burlar o sistema de avaliações; realizar engenharia reversa da plataforma; ou qualquer ação que comprometa a segurança e integridade do serviço.`,
  },
  {
    titulo: '5. Pedidos e Pagamentos',
    texto: `Ao confirmar um pedido, você solicita a compra diretamente ao estabelecimento parceiro. Os meios de pagamento disponíveis podem incluir Pix, cartão, dinheiro, carteiras digitais ou provedores de pagamento integrados, conforme configuração da plataforma e do parceiro. Cancelamentos e reembolsos dependem do status do pedido, do início do preparo, da forma de pagamento e das regras aplicáveis ao caso concreto, sempre respeitando a legislação de consumo.`,
  },
  {
    titulo: '6. Avaliações',
    texto: `As avaliações devem refletir experiências reais e verídicas. É proibido publicar avaliações falsas, ofensivas, discriminatórias ou que violem direitos de terceiros. A FoodExpress se reserva o direito de remover avaliações que violem estas diretrizes e de suspender usuários que façam uso abusivo do sistema de avaliações.`,
  },
  {
    titulo: '7. Propriedade Intelectual',
    texto: `Todos os conteúdos da plataforma — logotipo, design, código, textos e imagens — são de propriedade exclusiva da FoodExpress ou licenciados para uso. É vedada a reprodução, distribuição ou uso comercial sem autorização expressa. As marcas dos restaurantes parceiros pertencem aos seus respectivos titulares.`,
  },
  {
    titulo: '8. Limitação de Responsabilidade',
    texto: `A FoodExpress emprega esforços razoáveis para manter a plataforma disponível e segura, mas podem ocorrer instabilidades, manutenção, erros de conexão, atrasos por trânsito, clima, endereço incorreto, indisponibilidade do parceiro ou fatores fora do nosso controle. Reclamações sobre produto, preparo, embalagem, valor, entrega ou atendimento devem ser registradas pelos canais de suporte para análise e encaminhamento ao responsável.`,
  },
  {
    titulo: '9. Alterações nos Termos',
    texto: `Podemos modificar estes Termos a qualquer momento. Notificaremos os usuários sobre alterações relevantes por e-mail ou notificação no aplicativo com pelo menos 15 dias de antecedência. O uso continuado após a data de vigência das alterações implica aceitação dos novos termos.`,
  },
  {
    titulo: '10. Foro e Legislação',
    texto: `Estes Termos são regidos pela legislação brasileira, incluindo o Código de Defesa do Consumidor, o Marco Civil da Internet e a Lei Geral de Proteção de Dados. Eventuais controvérsias serão tratadas preferencialmente pelos canais de suporte e, quando necessário, pelo foro competente conforme a legislação aplicável.`,
  },
]

export default function TermosUso() {
  const navigate = useNavigate()

  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-surface-2 border border-border flex items-center justify-center hover:bg-primary-light hover:border-primary/30 transition-colors"
          >
            <ArrowLeft size={16} className="text-text-primary" />
          </button>
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h1 className="font-display text-lg font-extrabold text-text-primary">Termos de Uso</h1>
          </div>
          <span className="ml-auto text-xs text-text-muted font-semibold">Atualizado em jun/2026</span>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* Intro */}
        <Motion.div
          className="bg-primary-light border border-primary/20 rounded-2xl p-6 mb-8 flex gap-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        >
          <Shield size={22} className="text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-display font-bold text-text-primary mb-1">Leia com atenção</p>
            <p className="text-sm text-text-secondary leading-relaxed">
              Estes Termos de Uso regulam a relação entre você e a FoodExpress. Ao usar nossa plataforma, você confirma que leu, entendeu e concorda com todas as condições abaixo.
            </p>
          </div>
        </Motion.div>

        {/* Seções */}
        <div className="flex flex-col gap-6">
          {secoes.map((s, i) => (
            <Motion.div
              key={s.titulo}
              className="bg-white rounded-2xl border border-border p-6 shadow-sm"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <h2 className="font-display text-base font-extrabold text-text-primary mb-3">{s.titulo}</h2>
              <p className="text-sm text-text-secondary leading-relaxed">{s.texto}</p>
            </Motion.div>
          ))}
        </div>

        {/* Footer */}
        <Motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        >
          <p className="text-xs text-text-muted mb-4">
            Dúvidas? Entre em contato:{' '}
            <a href="mailto:vdasilvasouza77@gmail.com" className="text-primary font-bold hover:underline">
              vdasilvasouza77@gmail.com
            </a>
          </p>
          <Link
            to="/politica-privacidade"
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            Ver Política de Privacidade →
          </Link>
        </Motion.div>
      </main>
    </div>
  )
}
