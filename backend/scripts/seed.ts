import { config } from 'dotenv'
import { db } from '../src/lib/db'

config()

async function seedDatabase() {
  console.log('🌱 Iniciando seed do banco de dados...')

  const restaurantes = [
    { id: 'rest-001', nome: 'Pizza Bella', cnpj: '12.345.678/0001-90', email: 'contato@pizzabella.com', telefone: '(11) 99999-0001', endereco: 'Rua das Pizzas, 123, São Paulo, SP', latitude: -23.5505, longitude: -46.6333, categoria: 'Italiana', descricao: 'As melhores pizzas artesanais da cidade', status: 'ativo', taxa_comissao: 15, tempo_medio_preparo: 30 },
    { id: 'rest-002', nome: 'Burger House', cnpj: '98.765.432/0001-10', email: 'info@burgerhouse.com', telefone: '(11) 99999-0002', endereco: 'Av. dos Hambúrgueres, 456, São Paulo, SP', latitude: -23.5515, longitude: -46.6343, categoria: 'Americana', descricao: 'Hambúrgueres gourmet feitos com ingredientes frescos', status: 'ativo', taxa_comissao: 15, tempo_medio_preparo: 20 },
    { id: 'rest-003', nome: 'Sushi Express', cnpj: '11.222.333/0001-44', email: 'hello@sushiexpress.com', telefone: '(11) 99999-0003', endereco: 'Rua Oriental, 789, São Paulo, SP', latitude: -23.5525, longitude: -46.6353, categoria: 'Japonesa', descricao: 'Sushi fresco e delivery rápido', status: 'ativo', taxa_comissao: 15, tempo_medio_preparo: 25 },
    { id: 'rest-004', nome: 'Café & Cia', cnpj: '55.666.777/0001-88', email: 'cafe@cafecia.com', telefone: '(11) 99999-0004', endereco: 'Praça do Café, 321, São Paulo, SP', latitude: -23.5535, longitude: -46.6363, categoria: 'Cafeteria', descricao: 'Café especial e doces artesanais', status: 'ativo', taxa_comissao: 15, tempo_medio_preparo: 15 },
    { id: 'rest-005', nome: 'Taco Loco', cnpj: '99.888.777/0001-66', email: 'tacos@tacoloco.com', telefone: '(11) 99999-0005', endereco: 'Rua Mexicana, 654, São Paulo, SP', latitude: -23.5545, longitude: -46.6373, categoria: 'Mexicana', descricao: 'Autênticos tacos e burritos mexicanos', status: 'ativo', taxa_comissao: 15, tempo_medio_preparo: 20 },
  ]

  for (const r of restaurantes) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO restaurantes (id, nome, cnpj, email, telefone, endereco, latitude, longitude, categoria, descricao, status, taxa_comissao, tempo_medio_preparo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [r.id, r.nome, r.cnpj, r.email, r.telefone, r.endereco, r.latitude, r.longitude, r.categoria, r.descricao, r.status, r.taxa_comissao, r.tempo_medio_preparo]
    })
  }
  console.log('✅ Restaurantes inseridos')

  const cardapios = [
    { id: 'item-001', restaurante_id: 'rest-001', nome: 'Pizza Margherita', descricao: 'Molho de tomate, mussarela, manjericão fresco', preco: 35.90, categoria: 'Pizzas', disponivel: 1, destaque: 1, tempo_preparo: 25 },
    { id: 'item-002', restaurante_id: 'rest-001', nome: 'Pizza Calabresa', descricao: 'Molho de tomate, mussarela, calabresa, cebola', preco: 38.90, categoria: 'Pizzas', disponivel: 1, destaque: 0, tempo_preparo: 25 },
    { id: 'item-003', restaurante_id: 'rest-001', nome: 'Pizza Quatro Queijos', descricao: 'Mussarela, provolone, parmesão, gorgonzola', preco: 42.90, categoria: 'Pizzas', disponivel: 1, destaque: 1, tempo_preparo: 30 },
    { id: 'item-004', restaurante_id: 'rest-002', nome: 'Classic Burger', descricao: 'Pão brioche, 180g de carne, queijo cheddar, alface, tomate', preco: 28.90, categoria: 'Hambúrgueres', disponivel: 1, destaque: 1, tempo_preparo: 15 },
    { id: 'item-005', restaurante_id: 'rest-002', nome: 'Bacon Burger', descricao: 'Pão brioche, 180g de carne, bacon crocante, queijo cheddar', preco: 32.90, categoria: 'Hambúrgueres', disponivel: 1, destaque: 0, tempo_preparo: 15 },
    { id: 'item-006', restaurante_id: 'rest-002', nome: 'Onion Rings', descricao: 'Anéis de cebola empanados e fritos', preco: 12.90, categoria: 'Acompanhamentos', disponivel: 1, destaque: 0, tempo_preparo: 10 },
    { id: 'item-007', restaurante_id: 'rest-003', nome: 'Sushi Combo 20 peças', descricao: '10 sushis e 10 sashimis variados', preco: 45.90, categoria: 'Combos', disponivel: 1, destaque: 1, tempo_preparo: 20 },
    { id: 'item-008', restaurante_id: 'rest-003', nome: 'Temaki Salmão', descricao: 'Cone de alga nori recheado com salmão fresco', preco: 18.90, categoria: 'Temaki', disponivel: 1, destaque: 0, tempo_preparo: 15 },
    { id: 'item-009', restaurante_id: 'rest-003', nome: 'Yakisoba', descricao: 'Macarrão frito com legumes e carne', preco: 22.90, categoria: 'Pratos Quentes', disponivel: 1, destaque: 0, tempo_preparo: 20 },
    { id: 'item-010', restaurante_id: 'rest-004', nome: 'Café Espresso', descricao: 'Café espresso tradicional italiano', preco: 5.90, categoria: 'Bebidas', disponivel: 1, destaque: 1, tempo_preparo: 5 },
    { id: 'item-011', restaurante_id: 'rest-004', nome: 'Croissant', descricao: 'Croissant folhado francês', preco: 8.90, categoria: 'Padaria', disponivel: 1, destaque: 0, tempo_preparo: 10 },
    { id: 'item-012', restaurante_id: 'rest-004', nome: 'Torta de Maçã', descricao: 'Torta de maçã caseira com canela', preco: 15.90, categoria: 'Doces', disponivel: 1, destaque: 1, tempo_preparo: 15 },
    { id: 'item-013', restaurante_id: 'rest-005', nome: 'Taco Al Pastor', descricao: 'Taco com carne de porco marinada, abacaxi, cebola', preco: 12.90, categoria: 'Tacos', disponivel: 1, destaque: 1, tempo_preparo: 15 },
    { id: 'item-014', restaurante_id: 'rest-005', nome: 'Burrito Chicken', descricao: 'Burrito recheado com frango, arroz, feijão, queijo', preco: 18.90, categoria: 'Burritos', disponivel: 1, destaque: 0, tempo_preparo: 20 },
    { id: 'item-015', restaurante_id: 'rest-005', nome: 'Quesadilla', descricao: 'Tortilla recheada com queijo e vegetais', preco: 14.90, categoria: 'Quesadillas', disponivel: 1, destaque: 0, tempo_preparo: 10 },
  ]

  for (const item of cardapios) {
    await db.execute({
      sql: `INSERT OR REPLACE INTO cardapio (id, restaurante_id, nome, descricao, preco, categoria, disponivel, destaque, tempo_preparo) VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [item.id, item.restaurante_id, item.nome, item.descricao, item.preco, item.categoria, item.disponivel, item.destaque, item.tempo_preparo]
    })
  }
  console.log('✅ Cardápios inseridos')
  console.log('🎉 Seed concluído!')
}

seedDatabase().catch(console.error)
