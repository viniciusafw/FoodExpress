// app/(dashboard)/gerente/page.tsx
import { auth } from '@clerk/nextjs'  
import { redirect } from 'next/navigation'
import GerenteDashboard from '@/components/gerente/GerenteDashboard'   

export default async function GerentePage() {
  const { userId } = auth()  
  
  if (!userId) {
    redirect('/login')  
  }

  // DADOS FIXOS 
  const gerente = {
    id: userId,
    nome: 'Gerente Teste',
    email: 'email@teste.com',
    cargo: 'Gerente Geral'
  }

  const relatorios = {
    total_pedidos: 1250,
    faturamento_total: 45890.50,
    ticket_medio: 36.71,
    cancelamentos: 87,
    avaliacao_media: 4.7
  }

  const vendasPorPeriodo = [
    { data: '2024-03-10', pedidos: 145, faturamento: 5230.50 },
    { data: '2024-03-11', pedidos: 168, faturamento: 6120.30 },
    { data: '2024-03-12', pedidos: 132, faturamento: 4750.90 },
    { data: '2024-03-13', pedidos: 189, faturamento: 6980.75 },
    { data: '2024-03-14', pedidos: 156, faturamento: 5890.25 },
    { data: '2024-03-15', pedidos: 201, faturamento: 7890.40 },
    { data: '2024-03-16', pedidos: 177, faturamento: 6490.20 }
  ]

  return (
    <GerenteDashboard 
      gerente={gerente}
      relatorios={relatorios}
      vendasPorPeriodo={vendasPorPeriodo}
    />
  )
}