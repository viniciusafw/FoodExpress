import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Armazenar requisições por IP em memória (em produção usar Redis)
const requests_por_ip = new Map<string, number[]>()

// Limites de rate limit
const LIMITE_REQUISICOES = 100 // requisições
const JANELA_TEMPO = 60 * 1000 // 1 minuto em ms

// Função para limpar requisições antigas
function limparRequisicoes(ip: string, agora: number) {
  const requisicoes = requests_por_ip.get(ip) || []
  const requisicoes_validas = requisicoes.filter(tempo => agora - tempo < JANELA_TEMPO)
  
  if (requisicoes_validas.length === 0) {
    requests_por_ip.delete(ip)
  } else {
    requests_por_ip.set(ip, requisicoes_validas)
  }
  
  return requisicoes_validas.length
}

// Middleware de Rate Limiting
export function aplicarRateLimiting(request: NextRequest): NextResponse | null {
  // Obter IP do cliente
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const agora = Date.now()

  // Limpar requisições antigas
  const total_requisicoes = limparRequisicoes(ip, agora)

  // Se exceder o limite
  if (total_requisicoes >= LIMITE_REQUISICOES) {
    return NextResponse.json(
      {
        erro: 'Limite de requisições excedido',
        mensagem: `Máximo de ${LIMITE_REQUISICOES} requisições por minuto`,
        retry_after: 60
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60'
        }
      }
    )
  }

  // Registrar essa requisição
  const requisicoes = requests_por_ip.get(ip) || []
  requisicoes.push(agora)
  requests_por_ip.set(ip, requisicoes)

  return null // Permitir requisição
}

// Limites específicos por rota
export const LIMITES_POR_ROTA = {
  '/api/auth': { requisicoes: 5, janela: 15 * 60 * 1000 }, // 5 por 15 min
  '/api/pedidos/POST': { requisicoes: 10, janela: 60 * 1000 }, // 10 por min
  '/api/restaurantes/POST': { requisicoes: 3, janela: 60 * 60 * 1000 }, // 3 por hora
  '/api/entregadores/POST': { requisicoes: 3, janela: 60 * 60 * 1000 }, // 3 por hora
  '/api/clientes/POST': { requisicoes: 5, janela: 60 * 60 * 1000 }, // 5 por hora
}

// Função para aplicar limite específico por rota
export function verificarLimiteRota(ip: string, rota: string, metodo: string = 'GET'): boolean {
  const chave_rota = `${rota}/${metodo}`
  const limite = LIMITES_POR_ROTA[chave_rota as keyof typeof LIMITES_POR_ROTA]

  if (!limite) return true // Sem limite específico

  const key = `${ip}:${rota}:${metodo}`
  const agora = Date.now()
  
  // Obter requisições armazenadas
  const requisicoes = requests_por_ip.get(key) || []
  const requisicoes_validas = requisicoes.filter(tempo => agora - tempo < limite.janela)

  if (requisicoes_validas.length >= limite.requisicoes) {
    return false // Limite excedido
  }

  // Registrar requisição
  requisicoes_validas.push(agora)
  requests_por_ip.set(key, requisicoes_validas)

  return true // Permitir
}
