import { config } from 'dotenv'
import { hashSenha } from '../lib/password'

config()

type Row = Record<string, unknown>
type DatabaseClient = {
  execute: (query: { sql: string; args?: unknown[] } | string) => Promise<{ rows: unknown[]; rowsAffected: number }>
}

let db: DatabaseClient
let ensureDatabaseHealth: () => Promise<void>

const args = new Set(process.argv.slice(2))
const shouldReset = args.has('--reset')
const shouldClear = args.has('--clear')
const shouldHelp = args.has('--help') || args.has('-h')

const PASSWORD_FAKE = process.env.SEED_FAKE_PASSWORD || 'Teste@1234'
let PASSWORD_FAKE_HASH = ''

const TOTAL_RESTAURANTES = Number(process.env.SEED_RESTAURANTES || 700)
const TOTAL_CLIENTES = Number(process.env.SEED_CLIENTES || 2000)
const TOTAL_ENTREGADORES = Number(process.env.SEED_ENTREGADORES || 250)
const TOTAL_OPERADORES = Number(process.env.SEED_OPERADORES || 8)
const TOTAL_PEDIDOS = Number(process.env.SEED_PEDIDOS || 18000)

const rng = mulberry32(Number(process.env.SEED_RANDOM || 20260604))

const bairros = [
  ['Meireles', -3.7247, -38.4917],
  ['Aldeota', -3.7394, -38.4994],
  ['Varjota', -3.7302, -38.4932],
  ['Coco', -3.7474, -38.4799],
  ['Benfica', -3.7437, -38.5382],
  ['Centro', -3.7275, -38.5275],
  ['Fatima', -3.7468, -38.5228],
  ['Papicu', -3.7419, -38.4735],
  ['Messejana', -3.8315, -38.4931],
  ['Parangaba', -3.7744, -38.5634],
  ['Montese', -3.7629, -38.5414],
  ['Dionisio Torres', -3.7545, -38.5017],
  ['Cambeba', -3.8039, -38.4884],
  ['Maraponga', -3.7939, -38.5725],
  ['Joaquim Tavora', -3.7435, -38.5127],
  ['Edson Queiroz', -3.7711, -38.4804],
  ['Praia de Iracema', -3.7199, -38.5145],
  ['Presidente Kennedy', -3.7338, -38.5656],
] as const

const categorias = [
  'Pizza',
  'Lanches',
  'Sushi',
  'Açaí',
  'Brasileira',
  'Nordestina',
  'Churrasco',
  'Frutos do Mar',
  'Saladas',
  'Sobremesas',
  'Padaria',
  'Cafeteria',
  'Pastel',
  'Árabe',
  'Mexicana',
  'Saudável',
  'Mercado',
  'Conveniência',
] as const

const nomes = [
  'Ana', 'Bruno', 'Camila', 'Daniel', 'Eduarda', 'Felipe', 'Gabriela', 'Henrique',
  'Isabela', 'Joao', 'Karina', 'Lucas', 'Mariana', 'Nicolas', 'Olivia', 'Pedro',
  'Rafaela', 'Samuel', 'Talita', 'Victor', 'Yasmin', 'Caio', 'Larissa', 'Renato',
  'Beatriz', 'Diego', 'Helena', 'Mateus', 'Patricia', 'Thiago',
]

const sobrenomes = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Almeida',
  'Ferreira', 'Rodrigues', 'Martins', 'Gomes', 'Barbosa', 'Araujo', 'Mendes',
  'Nogueira', 'Rocha', 'Carvalho', 'Teixeira', 'Correia',
]

const ruas = [
  'Av. Santos Dumont', 'Av. Dom Luis', 'Rua Ana Bilhar', 'Rua Osvaldo Cruz',
  'Av. Beira Mar', 'Rua Costa Barros', 'Rua Padre Valdevino', 'Av. Rui Barbosa',
  'Rua Carlos Vasconcelos', 'Av. Washington Soares', 'Rua Monsenhor Bruno',
  'Av. Alberto Craveiro', 'Rua Professor Dias da Rocha', 'Av. Godofredo Maciel',
]

const formasPagamento = ['Pix', 'Dinheiro', 'Credito', 'Debito']
const statusPedidos = ['entregue', 'entregue', 'entregue', 'entregue', 'cancelado', 'confirmado', 'preparando', 'pronto', 'entregando']
const statusDisputa = ['aberta', 'em_analise', 'resolvida', 'resolvida']
const prioridades = ['baixa', 'normal', 'normal', 'alta']

if (shouldHelp) {
  console.log(`FoodExpress seed

Uso:
  npm run seed
  npm run seed -- --reset
  npm run seed -- --clear

Variáveis opcionais:
  SEED_RESTAURANTES=700
  SEED_CLIENTES=2000
  SEED_ENTREGADORES=250
  SEED_PEDIDOS=18000
  SEED_FAKE_PASSWORD=Teste@1234
`)
  process.exit(0)
}

if (shouldReset && shouldClear) {
  console.error('Use apenas uma flag por vez: --reset recria os dados fake, --clear apenas remove os dados fake.')
  process.exit(1)
}

function mulberry32(seed: number) {
  return () => {
    let t = seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

function pick<T>(items: readonly T[]) {
  return items[Math.floor(rng() * items.length)]
}

function rand(min: number, max: number) {
  return min + rng() * (max - min)
}

function int(min: number, max: number) {
  return Math.floor(rand(min, max + 1))
}

function money(value: number) {
  return Number(value.toFixed(2))
}

function pad(value: number, size: number) {
  return String(value).padStart(size, '0')
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function hashTexto(value: string) {
  return String(value || '').split('').reduce((total, char) => (
    ((total << 5) - total + char.charCodeAt(0)) | 0
  ), 0)
}

function sqlDate(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

function sqlOnlyDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateMonthsAgo(maxDays = 180) {
  const date = new Date()
  date.setDate(date.getDate() - int(0, maxDays))
  date.setHours(int(8, 23), int(0, 59), int(0, 59), 0)
  return date
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function bairroComCoordenada() {
  const [bairro, lat, lng] = pick(bairros)
  return {
    bairro,
    latitude: Number((lat + rand(-0.01, 0.01)).toFixed(7)),
    longitude: Number((lng + rand(-0.01, 0.01)).toFixed(7)),
  }
}

function nomePessoa() {
  return `${pick(nomes)} ${pick(sobrenomes)}`
}

function emailFake(prefixo: string, index: number) {
  return `${prefixo}.${pad(index, 5)}@seed.foodexpress.test`
}

function telefoneFake(index: number) {
  return `(85) 9${pad(70000000 + index, 8)}`
}

function cpfFake(index: number) {
  return `900${pad(index, 8)}`.slice(0, 11)
}

function cnpjFake(index: number) {
  return `90${pad(index, 8)}0001${pad(index % 99, 2)}`.slice(0, 14)
}

function placaFake(index: number) {
  const letras = ['HUX', 'POG', 'NQZ', 'OSR', 'PMW', 'KLU', 'NVE', 'QXY']
  return `${letras[index % letras.length]}${int(1, 9)}${String.fromCharCode(65 + index % 26)}${pad(index % 100, 2)}`
}

function enderecoFake(bairro: string) {
  return `${pick(ruas)}, ${int(40, 3990)} - ${bairro}, Fortaleza - CE`
}

function termoImagem(categoria: string) {
  const termos: Record<string, string> = {
    Pizza: 'pizza,restaurant',
    Lanches: 'burger,sandwich,restaurant',
    Sushi: 'sushi,japanese-food',
    Açaí: 'acai,bowl,fruit',
    Brasileira: 'brazilian-food,lunch',
    Nordestina: 'brazilian-food,meat,rice',
    Churrasco: 'barbecue,steak',
    'Frutos do Mar': 'seafood,shrimp,fish',
    Saladas: 'salad,healthy-food',
    Sobremesas: 'dessert,cake,ice-cream',
    Padaria: 'bakery,bread',
    Cafeteria: 'coffee,café',
    Pastel: 'fried-pastry,street-food',
    Árabe: 'kebab,hummus,arabic-food',
    Mexicana: 'tacos,mexican-food',
    Saudável: 'healthy-bowl,salad',
    Mercado: 'grocery,supermarket,produce',
    Conveniência: 'convenience-store,snacks',
  }
  return termos[categoria] || 'food,restaurant'
}

const fotosComida = [
  '1513104890138-7c749659a591',
  '1568901346375-23c9450c58cd',
  '1579871494447-9811cf80d66c',
  '1590301157890-4810ed352733',
  '1546069901-ba9599a7e63c',
  '1604908176997-125f25cc6f3d',
  '1555939594-58d7cb561ad1',
  '1512621776951-a57141f2eefd',
  '1488477181946-6428a0291777',
  '1509440159596-0249088772ff',
  '1509042239860-f550ce710b93',
  '1601050690597-df0568f70950',
  '1541518763669-27fef04b14ea',
  '1565299585323-38d6b0865b47',
  '1563805042-7684c019e1cb',
  '1504674900247-0877df9cc836',
  '1504754524776-8f4f37790ca0',
  '1565958011703-44f9829ba187',
  '1473093295043-cdd812d0e601',
  '1551183053-bf91a1d81141',
]

const fotosPorCategoria: Record<string, string> = {
  Pizza: '1513104890138-7c749659a591',
  Lanches: '1568901346375-23c9450c58cd',
  Sushi: '1579871494447-9811cf80d66c',
  Açaí: '1590301157890-4810ed352733',
  Brasileira: '1546069901-ba9599a7e63c',
  Nordestina: '1604908176997-125f25cc6f3d',
  Churrasco: '1555939594-58d7cb561ad1',
  'Frutos do Mar': '1559847844-5315695dadae',
  Saladas: '1512621776951-a57141f2eefd',
  Sobremesas: '1488477181946-6428a0291777',
  Padaria: '1509440159596-0249088772ff',
  Cafeteria: '1509042239860-f550ce710b93',
  Pastel: '1601050690597-df0568f70950',
  Árabe: '1541518763669-27fef04b14ea',
  Mexicana: '1565299585323-38d6b0865b47',
  Saudável: '1512621776951-a57141f2eefd',
  Mercado: '1542838132-92c53300491e',
  Conveniência: '1528698827591-e19ccd7bc23d',
}

function imagemUnsplash(photoId: string) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=900&h=700&q=80`
}

function imagemCategoria(categoria: string, seed = 1) {
  return imagemUnsplash(fotosPorCategoria[categoria] || fotosComida[Math.abs(seed) % fotosComida.length])
}

function imagemProdutoCategoria(categoria: string, restIndex: number, itemIndex: number, nome: string) {
  const foto = fotosComida[Math.abs(hashTexto(`${categoria}-${nome}-${restIndex}-${itemIndex}`)) % fotosComida.length]
  return imagemUnsplash(foto)
}

function nomeRestaurante(categoria: string, index: number, bairro: string) {
  const nomesPorCategoria: Record<string, string[]> = {
    Pizza: ['Vignoli Pizzaria', 'Pasto & Pizzas', 'Pizza Hut', 'Domino’s Pizza', 'Forneria Coriolano', 'Pizzaria O Forno'],
    Lanches: ['McDonald’s', 'Burger King', 'Bulls Burger', 'The Burger House', 'Johnny Rockets', 'Subway'],
    Sushi: ['Ryori Sushi', 'Soho Restaurante', 'Misaki Sushi', 'Sushi Hito', 'Kina Sushi', 'Temakeria Fortal'],
    Açaí: ['Açaí Concept', 'Oakberry Açaí', 'Açaí do Joca', 'Point do Açaí', 'Açaí Beat', 'Amazon Açaí'],
    Brasileira: ['Coco Bambu', 'Geppos Restaurante', 'Santa Grelha', 'Mangai', 'João do Frango', 'Kina do Feijão Verde'],
    Nordestina: ['Carneiro do Ordones', 'Colher de Pau', 'Lá na Roça', 'Cantinho do Frango', 'Restaurante Dallas', 'Panelinha Nordestina'],
    Churrasco: ['Santa Grelha', 'Cabana del Primo', 'Sal e Brasa', 'Boi Preto Grill', 'Picanha do Cowboy', 'Brasa Premium'],
    'Frutos do Mar': ['Coco Bambu Beira Mar', 'Peixada do Meio', 'Mar de Fortaleza', 'Camarão Cearense', 'Barraca Atlantidz', 'O Camarão'],
    Saladas: ['Greenlife', 'Boali', 'Fit Food Fresh', 'Salad Bowl Fortaleza', 'Natural Leve', 'Vila Saudável'],
    Sobremesas: ['San Paolo Gelato', '50 Sabores', 'Le Brun Café', 'Brownie do Luiz', 'Casa Bauducco', 'Doceria Sublime'],
    Padaria: ['Costa Mendes Delicatessen', 'Padaria Ideal', 'Empório do Pão', 'Pão de Açúcar Padaria', 'Monte Carlo Pães', 'Casa do Pão'],
    Cafeteria: ['Café Viriato', 'Santa Clara Café', 'Le Pain Le Café', 'The Coffee', 'Café Couture', 'Benévolo Café'],
    Pastel: ['Pastelândia', 'Pastel do Trevo', 'Pastel Brasil', 'Feira do Pastel', 'Pastel & Cia', 'Pastel do Centro'],
    Árabe: ['Habib’s', 'Esfiha Chic', 'Arabian Grill', 'Casa Libanesa', 'Kebab Fortaleza', 'Saj Restaurante'],
    Mexicana: ['Taco Alto', 'Guacamole Cocina', 'Los Mex Fortaleza', 'La Frontera', 'Burrito Club', 'El Paso Tex-Mex'],
    Saudável: ['Greenlife', 'Fit Food', 'Boali', 'Natural Leve', 'Salad Bowl', 'Vila Orgânica'],
    Mercado: ['Mercadinhos São Luiz', 'Super Lagoa', 'Supermercado Pinheiro', 'Pão de Açúcar', 'Carrefour Bairro', 'Frangolândia'],
    Conveniência: ['Oxxo Conveniência', 'Shell Select', 'BR Mania', 'ampm Conveniência', 'Mercadinho Express', 'Conveniência 24h'],
  }
  const lista = nomesPorCategoria[categoria] || nomesPorCategoria.Brasileira
  return `${lista[(index - 1) % lista.length]} ${bairro}`
}

function promoRestaurante(index: number) {
  if (index % 5 === 0) return '20% OFF'
  if (index % 8 === 0) return 'Frete grátis'
  if (index % 13 === 0) return 'Cupom FAKE'
  if (index % 21 === 0) return 'Combo em oferta'
  return null
}

function produtosPorCategoria(categoria: string) {
  const base: Record<string, Array<[string, string, number, string]>> = {
    Pizza: [
      ['Pizza Calabresa', 'Massa fina, molho de tomate, mussarela, calabresa, cebola roxa, azeitona e orégano', 42.9, 'Pizza'],
      ['Pizza Frango Catupiry', 'Massa artesanal, frango desfiado, catupiry, milho verde, mussarela e orégano', 45.9, 'Pizza'],
      ['Pizza Quatro Queijos', 'Mussarela, provolone, parmesão, gorgonzola, molho de tomate e manjericão', 48.9, 'Pizza'],
      ['Pizza Chocolate com Morango', 'Massa doce, chocolate cremoso, morango fresco e leite em pó', 39.9, 'Sobremesas'],
    ],
    Lanches: [
      ['Smash Duplo', 'Pão brioche, dois burgers smash, cheddar, picles, cebola e molho da casa', 31.9, 'Lanches'],
      ['Burger Bacon', 'Pão selado, blend 160g, cheddar, bacon crocante, barbecue e maionese verde', 35.9, 'Lanches'],
      ['Batata Cheddar Bacon', 'Batata frita, cheddar cremoso, bacon, cebolinha e molho ranch', 22.9, 'Acompanhamentos'],
      ['Milkshake Chocolate', 'Sorvete de baunilha, calda de chocolate, chantilly e farofa crocante', 18.9, 'Bebidas'],
    ],
    Sushi: [
      ['Combo 20 Peças', 'Uramaki, niguiri, hot roll, skin, salmão, cream cheese, arroz japonês e nori', 54.9, 'Sushi'],
      ['Temaki Salmão', 'Alga nori, arroz japonês, salmão fresco, cream cheese, cebolinha e gergelim', 27.9, 'Sushi'],
      ['Hot Roll', 'Salmão, cream cheese, arroz japonês, nori, massa crocante e molho tare', 32.9, 'Sushi'],
      ['Yakisoba Misto', 'Macarrão oriental, carne, frango, legumes, shoyu, gengibre e óleo de gergelim', 36.9, 'Pratos quentes'],
    ],
    Açaí: [
      ['Açaí 500ml', 'Açaí cremoso, banana, granola, leite em pó, leite condensado e morango', 25.9, 'Açaí'],
      ['Açaí 700ml', 'Açaí batido, cupuaçu, banana, paçoca, granola e creme de ninho', 32.9, 'Açaí'],
      ['Cupuaçu 400ml', 'Creme de cupuaçu, leite condensado, castanha, banana e granola', 22.9, 'Cremes'],
      ['Brownie', 'Chocolate meio amargo, manteiga, ovos, farinha, nozes e calda quente', 13.9, 'Sobremesas'],
    ],
    Brasileira: [
      ['Prato Executivo', 'Arroz branco, feijão, farofa, salada, bife acebolado e batata frita', 29.9, 'Pratos'],
      ['Feijoada Individual', 'Feijão preto, carne seca, calabresa, arroz, couve, farofa e laranja', 34.9, 'Pratos'],
      ['Frango Grelhado', 'Filé de frango, arroz integral, legumes salteados, purê e molho de ervas', 31.9, 'Pratos'],
      ['Suco Natural', 'Polpa de fruta, água gelada, gelo e opção de açúcar', 10.9, 'Bebidas'],
    ],
    Nordestina: [
      ['Baião de Dois', 'Arroz, feijão verde, queijo coalho, nata, carne de sol, coentro e manteiga da terra', 38.9, 'Nordestina'],
      ['Carne de Sol Completa', 'Carne de sol, macaxeira, arroz, feijão verde, farofa, vinagrete e manteiga', 52.9, 'Nordestina'],
      ['Panelada Cearense', 'Bucho bovino, legumes, caldo temperado, arroz branco, pimenta e cheiro-verde', 34.9, 'Nordestina'],
      ['Tapioca de Queijo Coalho', 'Goma de tapioca, queijo coalho, manteiga, coco ralado e leite condensado opcional', 18.9, 'Lanches'],
    ],
    Churrasco: [
      ['Picanha Grelhada', 'Picanha, sal grosso, arroz biro-biro, farofa, vinagrete e batata rústica', 89.9, 'Churrasco'],
      ['Combo Churrasco Família', 'Picanha, frango, linguiça, pão de alho, queijo coalho, farofa e molho campanha', 189.9, 'Churrasco'],
      ['Costela Assada', 'Costela bovina, barbecue, mandioca, arroz branco, farofa e cheiro-verde', 79.9, 'Churrasco'],
      ['Pão de Alho', 'Pão baguete, creme de alho, queijo, manteiga, orégano e salsinha', 15.9, 'Acompanhamentos'],
    ],
    'Frutos do Mar': [
      ['Moqueca de Peixe', 'Peixe fresco, leite de coco, pimentões, tomate, cebola, coentro e arroz branco', 58.9, 'Frutos do Mar'],
      ['Camarão Internacional', 'Camarão, arroz cremoso, ervilha, presunto, queijo gratinado e batata palha', 72.9, 'Frutos do Mar'],
      ['Peixada Cearense', 'Peixe em postas, legumes, ovos, pirão, arroz e cheiro-verde', 64.9, 'Frutos do Mar'],
      ['Casquinha de Siri', 'Carne de siri, leite de coco, farinha panko, coentro, queijo e limão', 28.9, 'Entradas'],
    ],
    Saladas: [
      ['Salada Caesar com Frango', 'Alface romana, frango grelhado, parmesão, croutons e molho Caesar', 34.9, 'Saladas'],
      ['Bowl de Salmão', 'Arroz japonês, salmão, avocado, pepino, manga, gergelim e molho tare', 48.9, 'Saladas'],
      ['Salada Tropical', 'Folhas, manga, tomate-cereja, castanha, queijo coalho e molho cítrico', 32.9, 'Saladas'],
      ['Wrap Integral', 'Tortilla integral, frango, folhas, cenoura, cream cheese e ervas', 27.9, 'Lanches'],
    ],
    Sobremesas: [
      ['Gelato Pistache', 'Gelato artesanal de pistache, farofa doce, calda cremosa e castanha', 18.9, 'Sobremesas'],
      ['Brownie com Sorvete', 'Brownie de chocolate, sorvete de creme, calda quente e castanha', 24.9, 'Sobremesas'],
      ['Cheesecake Frutas Vermelhas', 'Cream cheese, base crocante, geleia de frutas vermelhas e raspas de limão', 22.9, 'Sobremesas'],
      ['Torta Banoffee', 'Banana, doce de leite, chantilly, canela e massa amanteigada', 21.9, 'Sobremesas'],
    ],
    Padaria: [
      ['Pão Francês 6 Unidades', 'Farinha de trigo, fermento, água, sal e casca crocante', 6.9, 'Padaria'],
      ['Croissant Presunto e Queijo', 'Massa folhada, manteiga, presunto, queijo mussarela e orégano', 14.9, 'Padaria'],
      ['Bolo de Cenoura', 'Cenoura, ovos, farinha, chocolate, manteiga e cobertura cremosa', 12.9, 'Sobremesas'],
      ['Café com Leite', 'Café espresso, leite vaporizado e canela opcional', 9.9, 'Cafeteria'],
    ],
    Cafeteria: [
      ['Cappuccino Cremoso', 'Café espresso, leite vaporizado, chocolate, canela e espuma cremosa', 13.9, 'Cafeteria'],
      ['Torrada Avocado', 'Pão artesanal, avocado, ovo, tomate, limão, azeite e pimenta-do-reino', 24.9, 'Lanches'],
      ['Waffle de Morango', 'Waffle, morango, mel, chantilly, calda de chocolate e castanha', 22.9, 'Sobremesas'],
      ['Cold Brew', 'Café extraído a frio, gelo e laranja desidratada', 15.9, 'Bebidas'],
    ],
    Pastel: [
      ['Pastel de Carne', 'Massa crocante, carne moída, azeitona, ovo, cebola e cheiro-verde', 12.9, 'Pastel'],
      ['Pastel de Queijo', 'Massa crocante, queijo mussarela, orégano e tomate', 11.9, 'Pastel'],
      ['Pastel Camarão Catupiry', 'Massa crocante, camarão, catupiry, cebola e coentro', 18.9, 'Pastel'],
      ['Caldo de Cana', 'Cana moída na hora, gelo e limão opcional', 8.9, 'Bebidas'],
    ],
    Árabe: [
      ['Esfiha Carne', 'Massa aberta, carne temperada, tomate, cebola, limão e especiarias árabes', 8.9, 'Árabe'],
      ['Kibe Recheado', 'Trigo, carne bovina, hortelã, cebola, queijo e coalhada seca', 14.9, 'Árabe'],
      ['Shawarma Frango', 'Pão folha, frango temperado, alface, tomate, picles e molho de alho', 28.9, 'Árabe'],
      ['Homus com Pão Sírio', 'grão-de-bico, tahine, limão, azeite, páprica e pão sírio', 21.9, 'Entradas'],
    ],
    Mexicana: [
      ['Taco Al Pastor', 'Tortilla, porco marinado, abacaxi, cebola roxa, coentro e salsa picante', 26.9, 'Mexicana'],
      ['Burrito Carne', 'Tortilla, carne, arroz mexicano, feijão, queijo, sour cream e guacamole', 34.9, 'Mexicana'],
      ['Nachos Supreme', 'Nachos, cheddar, chilli, jalapeno, pico de gallo, sour cream e guacamole', 39.9, 'Mexicana'],
      ['Quesadilla Frango', 'Tortilla, frango, queijo, pimentão, cebola e salsa verde', 29.9, 'Mexicana'],
    ],
    Saudável: [
      ['Bowl Proteico', 'Frango grelhado, arroz integral, grão-de-bico, abacate, folhas e molho tahine', 38.9, 'Saudável'],
      ['Omelete Fit', 'Ovos, queijo branco, tomate, espinafre, cogumelos e ervas', 26.9, 'Saudável'],
      ['Crepioca Frango', 'Tapioca, ovo, frango desfiado, queijo branco e orégano', 24.9, 'Saudável'],
      ['Suco Verde', 'Couve, abacaxi, limão, gengibre, hortelã e água de coco', 12.9, 'Bebidas'],
    ],
    Mercado: [
      ['Cesta Café da Manhã', 'Pão francês, queijo, presunto, manteiga, café, leite, banana e mamão', 49.9, 'Mercado'],
      ['Kit Hortifruti da Semana', 'Banana, tomate, alface, cenoura, batata, cebola, maçã e cheiro-verde', 39.9, 'Hortifruti'],
      ['Combo Churrasco', 'Carvão, linguiça, pão de alho, queijo coalho, farofa e refrigerante', 79.9, 'Mercado'],
      ['Leite + Pão + Ovos', 'Leite integral, pão de forma, ovos brancos, manteiga e queijo mussarela', 31.9, 'Mercado'],
    ],
    Conveniência: [
      ['Kit Madrugada', 'Refrigerante, salgadinho, chocolate, água mineral e chiclete', 32.9, 'Conveniência'],
      ['Energético + Snack', 'Energético gelado, batata chips, amendoim torrado e gelo', 24.9, 'Bebidas'],
      ['Combo Higiene Rápida', 'Escova dental, pasta, desodorante, sabonete e lenço umedecido', 36.9, 'Conveniência'],
      ['Sorvete + Chocolate', 'Pote de sorvete, barra de chocolate, cobertura e castanha', 42.9, 'Sobremesas'],
    ],
  }

  const fallback = [
    ['Combo da Casa', 'Receita especial com ingredientes selecionados', 32.9, 'Pratos'],
    ['Executivo Completo', 'Porcao individual com acompanhamento e bebida', 28.9, 'Pratos'],
    ['Porcao Especial', 'Porcao para compartilhar com molho artesanal', 36.9, 'Acompanhamentos'],
    ['Sobremesa da Casa', 'Sobremesa fresca preparada no dia', 14.9, 'Sobremesas'],
  ] as Array<[string, string, number, string]>

  return base[categoria] || fallback
}

async function execute(sql: string, params: unknown[] = []) {
  return db.execute({ sql, args: params })
}

async function bulkUpsert(table: string, columns: string[], rows: Row[], updateColumns?: string[]) {
  if (!rows.length) return 0
  const updates = (updateColumns || columns.filter((column) => column !== 'id')).map((column) => `${column}=VALUES(${column})`)
  const chunkSize = 350
  let affected = 0

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const placeholders = chunk.map(() => `(${columns.map(() => '?').join(',')})`).join(',')
    const values = chunk.flatMap((row) => columns.map((column) => row[column] ?? null))
    const result = await execute(
      `INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates.join(',')}`,
      values
    )
    affected += result.rowsAffected
  }

  return affected
}

async function countFake(table: string, where = "id LIKE 'fake_%'") {
  const result = await execute(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`)
  return Number((result.rows[0] as { total?: number })?.total || 0)
}

async function resetFakeData(action: 'reset' | 'clear' = 'reset') {
  const label = action === 'clear' ? 'Clear solicitado' : 'Reset solicitado'
  console.log(`${label}: removendo somente dados fake com prefixo fake_.`)
  const deletions: Array<[string, string]> = [
    ['denuncias_produtos', "id LIKE 'fake_%'"],
    ['avaliacoes', "id LIKE 'fake_%'"],
    ['rotas', "id LIKE 'fake_%'"],
    ['disputas', "id LIKE 'fake_%'"],
    ['tickets', "id LIKE 'fake_%'"],
    ['pedidos', "id LIKE 'fake_%'"],
    ['cardapio', "id LIKE 'fake_%'"],
    ['gerentes', "id LIKE 'fake_%'"],
    ['operadores', "id LIKE 'fake_%'"],
    ['entregadores', "id LIKE 'fake_%'"],
    ['clientes', "id LIKE 'fake_%'"],
    ['cupons', "id LIKE 'fake_%' OR codigo LIKE 'FAKE%'"],
    ['relatorios_cache', "id LIKE 'fake_%'"],
    ['restaurantes', "id LIKE 'fake_%'"],
  ]

  for (const [table, where] of deletions) {
    const before = await countFake(table, where)
    await execute(`DELETE FROM ${table} WHERE ${where}`)
    console.log(`- ${table}: ${before} removidos`)
  }
}

async function assertDatabaseIsNotPopulated() {
  const tables = ['restaurantes', 'clientes', 'pedidos']
  const counts: Array<{ table: string; total: number }> = []

  for (const table of tables) {
    const result = await execute(`SELECT COUNT(*) AS total FROM ${table}`)
    counts.push({
      table,
      total: Number((result.rows[0] as { total?: number })?.total || 0),
    })
  }

  const populated = counts.filter((item) => item.total > 0)
  if (!populated.length) return

  console.log('Seed abortado: o banco já possui dados nas tabelas principais.')
  populated.forEach((item) => {
    console.log(`- ${item.table}: ${item.total} registros existentes`)
  })
  console.log('Nenhum dado foi inserido ou apagado. Para recriar apenas os dados fake, rode: npm run seed -- --reset')
  process.exit(0)
}

function createRestaurantes() {
  const rows: Row[] = []
  const gerentes: Row[] = []

  for (let i = 1; i <= TOTAL_RESTAURANTES; i++) {
    const categoria = categorias[(i - 1) % categorias.length]
    const local = bairroComCoordenada()
    const nome = nomeRestaurante(categoria, i, local.bairro)
    const id = `fake_rest_${pad(i, 4)}`
    const email = emailFake('restaurante', i)

    rows.push({
      id,
      user_id: `fake_user_rest_${pad(i, 4)}`,
      nome,
      cnpj: cnpjFake(i),
      email,
      telefone: telefoneFake(10000 + i),
      endereco: enderecoFake(local.bairro),
      latitude: local.latitude,
      longitude: local.longitude,
      categoria,
      descricao: `${nome} em ${local.bairro}, com cardápio de ${categoria.toLowerCase()} e entrega pelo FoodExpress.`,
      logo: imagemCategoria(categoria, i * 2),
      capa: imagemCategoria(categoria, i * 2 + 1),
      promo: promoRestaurante(i),
      status: 'ativo',
      taxa_comissao: money(rand(10, 18)),
      tempo_medio_preparo: int(15, 42),
      horario_abertura: i % 5 === 0 ? '10:00' : '18:00',
      horario_fechamento: i % 5 === 0 ? '22:30' : '23:59',
      dias_aberto: JSON.stringify(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']),
      formas_pagamento: JSON.stringify(formasPagamento),
      motivo_rejeicao: null,
      senha_hash: PASSWORD_FAKE_HASH,
      avaliacao_media: money(rand(3.8, 4.95)),
      created_at: sqlDate(dateMonthsAgo()),
    })

    gerentes.push({
      id: `fake_ger_${pad(i, 4)}`,
      user_id: `fake_user_ger_${pad(i, 4)}`,
      nome: nomePessoa(),
      email: emailFake('gerente', i),
      telefone: telefoneFake(20000 + i),
      cargo: 'Gerente',
      restaurante_id: id,
      permissoes: JSON.stringify(['cardapio', 'pedidos', 'relatorios', 'financeiro']),
      status: 'ativo',
      senha_hash: PASSWORD_FAKE_HASH,
      created_at: rows[rows.length - 1].created_at,
    })
  }

  return { restaurantes: rows, gerentes }
}

function createOperadores() {
  return Array.from({ length: TOTAL_OPERADORES }, (_, index) => {
    const i = index + 1
    return {
      id: `fake_op_${pad(i, 3)}`,
      user_id: `fake_user_op_${pad(i, 3)}`,
      nome: `Operador ${nomePessoa()}`,
      email: emailFake('operador', i),
      telefone: telefoneFake(30000 + i),
      turno: ['manha', 'tarde', 'noite', 'integral'][index % 4],
      status: 'ativo',
      senha_hash: PASSWORD_FAKE_HASH,
      created_at: sqlDate(dateMonthsAgo(120)),
    }
  })
}

function createClientes() {
  return Array.from({ length: TOTAL_CLIENTES }, (_, index) => {
    const i = index + 1
    const local = bairroComCoordenada()
    const nascimento = new Date(int(1970, 2006), int(0, 11), int(1, 28))
    return {
      id: `fake_cli_${pad(i, 5)}`,
      user_id: `fake_user_cli_${pad(i, 5)}`,
      nome: nomePessoa(),
      email: emailFake('cliente', i),
      telefone: telefoneFake(40000 + i),
      data_nascimento: sqlOnlyDate(nascimento),
      endereco_principal: enderecoFake(local.bairro),
      latitude: local.latitude,
      longitude: local.longitude,
      senha_hash: PASSWORD_FAKE_HASH,
      total_pedidos: 0,
      deletado_em: null,
      created_at: sqlDate(dateMonthsAgo()),
    }
  })
}

function createEntregadores() {
  return Array.from({ length: TOTAL_ENTREGADORES }, (_, index) => {
    const i = index + 1
    const local = bairroComCoordenada()
    const veiculo = i % 11 === 0 ? 'bicicleta' : 'moto'
    return {
      id: `fake_ent_${pad(i, 4)}`,
      user_id: `fake_user_ent_${pad(i, 4)}`,
      nome: nomePessoa(),
      email: emailFake('entregador', i),
      telefone: telefoneFake(50000 + i),
      cpf: cpfFake(i),
      veiculo_tipo: veiculo,
      veiculo_placa: veiculo === 'moto' ? placaFake(i) : null,
      documento_foto: null,
      status: i % 17 === 0 ? 'ocupado' : 'disponivel',
      latitude: local.latitude,
      longitude: local.longitude,
      ultima_atualizacao: sqlDate(addMinutes(new Date(), -int(1, 240))),
      avaliacao_media: money(rand(3.9, 4.98)),
      total_entregas: 0,
      saldo_disponivel: 0,
      saldo_total: 0,
      senha_hash: PASSWORD_FAKE_HASH,
      created_at: sqlDate(dateMonthsAgo()),
    }
  })
}

function createCardapio(restaurantes: Row[]) {
  const rows: Row[] = []

  restaurantes.forEach((restaurante, restIndex) => {
    const categoria = String(restaurante.categoria)
    const produtos = produtosPorCategoria(categoria)
    const extras = ['Coca-Cola Lata', 'Suco de Caju', 'Água Mineral', categoria === 'Mercado' || categoria === 'Conveniência' ? 'Chocolate Barra' : 'Pudim da Casa']

    produtos.forEach((produto, index) => {
      rows.push(cardapioRow(restaurante, restIndex, index + 1, produto))
    })

    extras.forEach((extra, index) => {
      rows.push(cardapioRow(restaurante, restIndex, produtos.length + index + 1, [
        extra,
        index < 3
          ? `${extra}, gelo, embalagem lacrada e acompanhamento para o pedido`
          : `${extra}, leite condensado, creme fresco e calda artesanal`,
        index < 3 ? rand(5.9, 12.9) : rand(10.9, 18.9),
        index < 3 ? 'Bebidas' : 'Sobremesas',
      ]))
    })
  })

  return rows
}

function cardapioRow(restaurante: Row, restIndex: number, itemIndex: number, produto: [string, string, number, string]) {
  const [nome, descricao, preco, categoria] = produto
  const precoBase = money(Number(preco) * rand(0.92, 1.18))
  const emPromocao = Boolean(restaurante.promo) && itemIndex <= 2
  const precoFinal = emPromocao ? money(precoBase * 0.82) : precoBase
  return {
    id: `fake_card_${pad(restIndex + 1, 4)}_${pad(itemIndex, 2)}`,
    restaurante_id: restaurante.id,
    nome,
    descricao,
    preco: precoFinal,
    preco_original: emPromocao ? precoBase : null,
    categoria,
    subcategoria: categoria,
    imagem: imagemProdutoCategoria(String(restaurante.categoria), restIndex, itemIndex, nome),
    ingredientes: JSON.stringify(descricao.split(',').map(item => item.trim()).filter(Boolean)),
    promocao_ativa: emPromocao ? 1 : 0,
    promocao_tipo: emPromocao ? 'desconto' : null,
    promocao_label: emPromocao ? String(restaurante.promo) : null,
    combo_itens: null,
    disponivel: itemIndex % 19 === 0 ? 0 : 1,
    destaque: itemIndex <= 2 ? 1 : 0,
    tempo_preparo: int(8, 38),
    created_at: restaurante.created_at,
  }
}

function createCupons() {
  const nomesCupom = ['FAKEBEMVINDO', 'FAKEFORTAL', 'FAKEPIX', 'FAKEALMOCO', 'FAKEJANTAR', 'FAKEFRETE']
  return Array.from({ length: 18 }, (_, index) => {
    const i = index + 1
    const expiracao = new Date()
    expiracao.setDate(expiracao.getDate() + int(20, 120))
    return {
      id: `fake_cup_${pad(i, 3)}`,
      codigo: `${nomesCupom[index % nomesCupom.length]}${pad(Math.floor(index / nomesCupom.length) + 1, 2)}`,
      desconto: index % 3 === 0 ? 8 : index % 3 === 1 ? 12 : 15,
      tipo: index % 2 === 0 ? 'percentual' : 'valor',
      minimo: [25, 35, 50, 70][index % 4],
      data_expiracao: sqlDate(expiracao),
      ativo: index % 7 === 0 ? 0 : 1,
      created_at: sqlDate(dateMonthsAgo(80)),
    }
  })
}

function createPedidos(restaurantes: Row[], clientes: Row[], entregadores: Row[], cardapio: Row[]) {
  const itensPorRestaurante = new Map<string, Row[]>()
  cardapio.forEach((item) => {
    const key = String(item.restaurante_id)
    const current = itensPorRestaurante.get(key) || []
    current.push(item)
    itensPorRestaurante.set(key, current)
  })

  const pedidos: Row[] = []
  const rotas: Row[] = []
  const avaliacoes: Row[] = []
  const now = new Date()

  for (let i = 1; i <= TOTAL_PEDIDOS; i++) {
    const createdAt = dateMonthsAgo()
    const isRecent = now.getTime() - createdAt.getTime() < 72 * 60 * 60 * 1000
    const restaurante = pick(restaurantes.filter((rest) => String(rest.status) !== 'pendente'))
    const cliente = pick(clientes)
    const entregador = pick(entregadores)
    const itens = itensPorRestaurante.get(String(restaurante.id)) || []
    const itemCount = int(1, Math.min(4, itens.length))
    const selecionados = Array.from({ length: itemCount }, () => pick(itens))
    const itensPedido = selecionados.map((item) => {
      const quantidade = int(1, 3)
      return {
        id: item.id,
        cardapioId: item.id,
        produtoId: item.id,
        restauranteId: restaurante.id,
        nome: item.nome,
        name: item.nome,
        quantidade,
        preco: item.preco,
        price: item.preco,
      }
    })
    const subtotal = money(itensPedido.reduce((sum, item) => sum + Number(item.preco) * item.quantidade, 0))
    const distancia = money(distanceKm(
      Number(restaurante.latitude),
      Number(restaurante.longitude),
      Number(cliente.latitude),
      Number(cliente.longitude)
    ) || rand(1.2, 11.5))
    const taxaEntrega = money(distancia < 2 ? 4.99 : Math.min(18.99, 4.99 + distancia * 1.6))
    const temPromoRestaurante = Boolean(restaurante.promo)
    const desconto = temPromoRestaurante && i % 4 === 0
      ? money(Math.min(22, subtotal * 0.18))
      : i % 13 === 0
        ? money(Math.min(15, subtotal * 0.12))
        : 0
    const total = money(subtotal + taxaEntrega - desconto)
    const formaPagamento = pick(['Pix', 'Dinheiro', 'Credito', 'Debito', 'Cartao online'])
    const status = isRecent ? pick(statusPedidos) : pick(['entregue', 'entregue', 'entregue', 'entregue', 'cancelado'])
    const preparo = int(12, 42)
    const entrega = int(10, 36)
    const confirmado = addMinutes(createdAt, int(2, 8))
    const pronto = addMinutes(confirmado, preparo)
    const entregue = addMinutes(pronto, entrega)
    const id = `fake_ped_${pad(i, 6)}`
    const ganhoEntregador = status === 'cancelado' ? 0 : money(taxaEntrega * 0.82 + distancia * 0.9)
    const avalia = status === 'entregue' && i % 3 !== 0
    const starsRest = avalia ? int(3, 5) : null
    const starsEnt = avalia ? int(3, 5) : null

    pedidos.push({
      id,
      cliente_id: cliente.id,
      restaurante_id: restaurante.id,
      entregador_id: status === 'cancelado' || status === 'confirmado' ? null : entregador.id,
      status,
      itens: JSON.stringify(itensPedido),
      subtotal,
      taxa_entrega: taxaEntrega,
      desconto,
      troco: formaPagamento === 'Dinheiro' && i % 9 === 0 ? money(total + int(5, 30)) : 0,
      total,
      forma_pagamento: formaPagamento,
      pagamento_status: status === 'cancelado' ? 'estornado' : formaPagamento === 'Dinheiro' ? 'pendente' : 'pago',
      pagamento_id: formaPagamento === 'Dinheiro' ? null : `fake_pay_${pad(i, 6)}`,
      endereco_entrega: cliente.endereco_principal,
      latitude_entrega: cliente.latitude,
      longitude_entrega: cliente.longitude,
      distancia_km: distancia,
      observacoes: i % 8 === 0 ? 'Enviar talheres e caprichar no molho.' : null,
      tempo_preparo_estimado: preparo,
      tempo_entrega_estimado: entrega,
      tempo_total_estimado: preparo + entrega,
      iniciado_em: sqlDate(createdAt),
      confirmado_em: status === 'cancelado' ? null : sqlDate(confirmado),
      pronto_em: ['pronto', 'entregando', 'entregue'].includes(String(status)) ? sqlDate(pronto) : null,
      entregue_em: status === 'entregue' ? sqlDate(entregue) : null,
      cancelado_em: status === 'cancelado' ? sqlDate(addMinutes(createdAt, int(3, 20))) : null,
      motivo_cancelamento: status === 'cancelado' ? pick(['Cliente desistiu', 'Produto indisponível', 'Restaurante fechou mais cedo']) : null,
      avaliacao_restaurante: starsRest,
      avaliacao_entregador: starsEnt,
      comentario: avalia ? pick(['Muito bom', 'Chegou rápido', 'Comida bem embalada', 'Compraria novamente']) : null,
      ganho_entregador: ganhoEntregador,
      repasse_entregador_status: status === 'entregue' && i % 5 !== 0 ? 'pago' : 'pendente',
      repasse_entregador_em: status === 'entregue' && i % 5 !== 0 ? sqlDate(addMinutes(entregue, int(20, 2880))) : null,
      created_at: sqlDate(createdAt),
      updated_at: sqlDate(status === 'entregue' ? entregue : addMinutes(createdAt, int(5, 60))),
    })

    if (!['cancelado', 'confirmado'].includes(String(status))) {
      rotas.push({
        id: `fake_rota_${pad(i, 6)}`,
        pedido_id: id,
        entregador_id: entregador.id,
        origem_lat: restaurante.latitude,
        origem_lng: restaurante.longitude,
        destino_lat: cliente.latitude,
        destino_lng: cliente.longitude,
        distancia_km: distancia,
        duracao_estimada: entrega,
        pontos_rota: JSON.stringify([
          [restaurante.latitude, restaurante.longitude],
          [Number(restaurante.latitude) + rand(-0.003, 0.003), Number(restaurante.longitude) + rand(-0.003, 0.003)],
          [cliente.latitude, cliente.longitude],
        ]),
        created_at: sqlDate(confirmado),
      })
    }

    if (avalia) {
      avaliacoes.push({
        id: `fake_av_rest_${pad(i, 6)}`,
        cliente_id: cliente.id,
        pedido_id: id,
        restaurante_id: restaurante.id,
        entregador_id: entregador.id,
        estrelas: starsRest,
        comentario: pick(['Comida excelente', 'Bom custo-benefício', 'Entrega dentro do prazo', 'Pedido veio certinho']),
        tipo: 'restaurante',
        created_at: sqlDate(addMinutes(entregue, int(10, 1440))),
      })
      avaliacoes.push({
        id: `fake_av_ent_${pad(i, 6)}`,
        cliente_id: cliente.id,
        pedido_id: id,
        restaurante_id: restaurante.id,
        entregador_id: entregador.id,
        estrelas: starsEnt,
        comentario: pick(['Entregador educado', 'Achou o endereço fácil', 'Boa comunicação', 'Entrega cuidadosa']),
        tipo: 'entregador',
        created_at: sqlDate(addMinutes(entregue, int(10, 1440))),
      })
    }
  }

  return { pedidos, rotas, avaliacoes }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return 0
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function createTickets(pedidos: Row[], clientes: Row[]) {
  return Array.from({ length: 360 }, (_, index) => {
    const i = index + 1
    const pedido = pick(pedidos)
    const cliente = clientes.find((item) => item.id === pedido.cliente_id) || pick(clientes)
    const status = pick(['aberto', 'respondido', 'fechado', 'fechado'])
    return {
      id: `fake_ticket_${pad(i, 5)}`,
      cliente_id: cliente.id,
      titulo: pick(['Pedido atrasado', 'Dúvida sobre cupom', 'Produto faltando', 'Pagamento duplicado', 'Alterar endereço']),
      descricao: pick([
        'Cliente informou dificuldade no fluxo do pedido.',
        'Solicitação aberta para acompanhamento do suporte.',
        'Cliente pediu retorno sobre uma compra recente.',
      ]),
      categoria: pick(['pedido', 'pagamento', 'cupom', 'endereco', 'atendimento']),
      pedido_id: pedido.id,
      status,
      prioridade: pick(prioridades),
      resposta: status === 'aberto' ? null : 'Atendimento retornou e orientou o cliente.',
      created_at: pedido.created_at,
      updated_at: pedido.updated_at,
    }
  })
}

function createDisputas(pedidos: Row[], operadores: Row[]) {
  const elegiveis = pedidos.filter((pedido) => ['entregue', 'cancelado'].includes(String(pedido.status)))
  return Array.from({ length: 240 }, (_, index) => {
    const i = index + 1
    const pedido = pick(elegiveis)
    const status = pick(statusDisputa)
    const resolvida = status === 'resolvida'
    return {
      id: `fake_disp_${pad(i, 5)}`,
      pedido_id: pedido.id,
      criador_id: index % 3 === 0 ? pedido.restaurante_id : pedido.cliente_id,
      tipo_reclamante: index % 3 === 0 ? 'restaurante' : 'cliente',
      categoria: pick(['atraso', 'produto_incorreto', 'pagamento', 'cancelamento', 'entrega']),
      descricao: pick([
        'Parte reclamante abriu disputa para revisar o pedido.',
        'Houve divergência entre o que foi solicitado e o que foi entregue.',
        'Pedido precisa de avaliação de suporte por diferença no valor.',
      ]),
      evidencias: JSON.stringify([]),
      status,
      resposta_outra_parte: status === 'aberta' ? null : 'Outra parte enviou explicação pelo painel.',
      resolucao: resolvida ? 'Disputa analisada e resolvida pelo suporte.' : null,
      resultado: resolvida ? (index % 2) : null,
      motivo_resolucao: resolvida ? pick(['reembolso_parcial', 'orientacao', 'credito_cupom']) : null,
      operador_responsavel_id: resolvida || status === 'em_analise' ? pick(operadores).id : null,
      criado_em: pedido.created_at,
      respondido_em: status === 'aberta' ? null : pedido.updated_at,
      resolvido_em: resolvida ? pedido.updated_at : null,
    }
  })
}

function createDenuncias(cardapio: Row[], clientes: Row[]) {
  return Array.from({ length: 450 }, (_, index) => {
    const i = index + 1
    const produto = pick(cardapio)
    const status = pick(['aberta', 'aberta', 'em_analise', 'resolvida'])
    return {
      id: `fake_den_${pad(i, 5)}`,
      produto_id: produto.id,
      restaurante_id: produto.restaurante_id,
      cliente_id: pick(clientes).id,
      produto_nome: produto.nome,
      motivo: pick(['Imagem incorreta', 'Preço divergente', 'Descrição confusa', 'Item indisponível', 'Produto diferente']),
      detalhe: 'Denúncia fake para validar tela do restaurante e acompanhamento do suporte.',
      status,
      resposta: status === 'resolvida' ? 'Restaurante revisou o item denunciado.' : null,
      created_at: sqlDate(dateMonthsAgo()),
      updated_at: status === 'resolvida' ? sqlDate(dateMonthsAgo(30)) : null,
    }
  })
}

function createRelatoriosCache() {
  const hoje = new Date()
  return ['diario', 'semanal', 'mensal'].map((periodo, index) => ({
    id: `fake_rel_${periodo}`,
    tipo: 'dashboard_geral',
    periodo,
    dados: JSON.stringify({
      pedidos: TOTAL_PEDIDOS,
      restaurantes: TOTAL_RESTAURANTES,
      clientes: TOTAL_CLIENTES,
      ticketMedio: money(rand(42, 68)),
      geradoPorSeed: true,
    }),
    data_referencia: sqlOnlyDate(addMinutes(hoje, -index * 1440)),
    created_at: sqlDate(hoje),
  }))
}

async function updateAggregates() {
  await execute(`UPDATE clientes c SET total_pedidos = (
    SELECT COUNT(*) FROM pedidos p WHERE p.cliente_id = c.id
  ) WHERE c.id LIKE 'fake_%'`)

  await execute(`UPDATE entregadores e SET
    total_entregas = (
      SELECT COUNT(*) FROM pedidos p WHERE p.entregador_id = e.id AND p.status = 'entregue'
    ),
    saldo_total = (
      SELECT COALESCE(SUM(p.ganho_entregador), 0) FROM pedidos p WHERE p.entregador_id = e.id AND p.status = 'entregue'
    ),
    saldo_disponivel = (
      SELECT COALESCE(SUM(p.ganho_entregador), 0) FROM pedidos p
      WHERE p.entregador_id = e.id AND p.status = 'entregue' AND p.repasse_entregador_status = 'pendente'
    )
  WHERE e.id LIKE 'fake_%'`)

  await execute(`UPDATE restaurantes r SET avaliacao_media = COALESCE((
    SELECT ROUND(AVG(a.estrelas), 2)
    FROM avaliacoes a
    WHERE a.restaurante_id = r.id AND a.tipo = 'restaurante'
  ), r.avaliacao_media)
  WHERE r.id LIKE 'fake_%'`)
}

async function main() {
  console.log('Iniciando seed FoodExpress MySQL...')
  const dbModule = await import('../lib/db')
  const schemaModule = await import('../lib/schema')
  db = dbModule.db
  ensureDatabaseHealth = schemaModule.ensureDatabaseHealth
  PASSWORD_FAKE_HASH = hashSenha(PASSWORD_FAKE)

  await ensureDatabaseHealth()

  if (shouldReset) {
    await resetFakeData('reset')
  } else if (shouldClear) {
    await resetFakeData('clear')
    console.log('Clear finalizado. Nenhum dado novo foi recriado.')
    process.exit(0)
  } else {
    await assertDatabaseIsNotPopulated()
  }

  const { restaurantes, gerentes } = createRestaurantes()
  const operadores = createOperadores()
  const clientes = createClientes()
  const entregadores = createEntregadores()
  const cardapio = createCardapio(restaurantes)
  const cupons = createCupons()
  const { pedidos, rotas, avaliacoes } = createPedidos(restaurantes, clientes, entregadores, cardapio)
  const tickets = createTickets(pedidos, clientes)
  const disputas = createDisputas(pedidos, operadores)
  const denuncias = createDenuncias(cardapio, clientes)
  const relatorios = createRelatoriosCache()

  const plan: Array<[string, string[], Row[]]> = [
    ['restaurantes', ['id', 'user_id', 'nome', 'cnpj', 'email', 'telefone', 'endereco', 'latitude', 'longitude', 'categoria', 'descricao', 'logo', 'capa', 'promo', 'status', 'taxa_comissao', 'tempo_medio_preparo', 'horario_abertura', 'horario_fechamento', 'dias_aberto', 'formas_pagamento', 'motivo_rejeicao', 'senha_hash', 'avaliacao_media', 'created_at'], restaurantes],
    ['gerentes', ['id', 'user_id', 'nome', 'email', 'telefone', 'cargo', 'restaurante_id', 'permissoes', 'status', 'senha_hash', 'created_at'], gerentes],
    ['operadores', ['id', 'user_id', 'nome', 'email', 'telefone', 'turno', 'status', 'senha_hash', 'created_at'], operadores],
    ['clientes', ['id', 'user_id', 'nome', 'email', 'telefone', 'data_nascimento', 'endereco_principal', 'latitude', 'longitude', 'senha_hash', 'total_pedidos', 'deletado_em', 'created_at'], clientes],
    ['entregadores', ['id', 'user_id', 'nome', 'email', 'telefone', 'cpf', 'veiculo_tipo', 'veiculo_placa', 'documento_foto', 'status', 'latitude', 'longitude', 'ultima_atualizacao', 'avaliacao_media', 'total_entregas', 'saldo_disponivel', 'saldo_total', 'senha_hash', 'created_at'], entregadores],
    ['cardapio', ['id', 'restaurante_id', 'nome', 'descricao', 'preco', 'preco_original', 'categoria', 'subcategoria', 'imagem', 'ingredientes', 'promocao_ativa', 'promocao_tipo', 'promocao_label', 'combo_itens', 'disponivel', 'destaque', 'tempo_preparo', 'created_at'], cardapio],
    ['cupons', ['id', 'codigo', 'desconto', 'tipo', 'minimo', 'data_expiracao', 'ativo', 'created_at'], cupons],
    ['pedidos', ['id', 'cliente_id', 'restaurante_id', 'entregador_id', 'status', 'itens', 'subtotal', 'taxa_entrega', 'desconto', 'troco', 'total', 'forma_pagamento', 'pagamento_status', 'pagamento_id', 'endereco_entrega', 'latitude_entrega', 'longitude_entrega', 'distancia_km', 'observacoes', 'tempo_preparo_estimado', 'tempo_entrega_estimado', 'tempo_total_estimado', 'iniciado_em', 'confirmado_em', 'pronto_em', 'entregue_em', 'cancelado_em', 'motivo_cancelamento', 'avaliacao_restaurante', 'avaliacao_entregador', 'comentario', 'ganho_entregador', 'repasse_entregador_status', 'repasse_entregador_em', 'created_at', 'updated_at'], pedidos],
    ['rotas', ['id', 'pedido_id', 'entregador_id', 'origem_lat', 'origem_lng', 'destino_lat', 'destino_lng', 'distancia_km', 'duracao_estimada', 'pontos_rota', 'created_at'], rotas],
    ['avaliacoes', ['id', 'cliente_id', 'pedido_id', 'restaurante_id', 'entregador_id', 'estrelas', 'comentario', 'tipo', 'created_at'], avaliacoes],
    ['tickets', ['id', 'cliente_id', 'titulo', 'descricao', 'categoria', 'pedido_id', 'status', 'prioridade', 'resposta', 'created_at', 'updated_at'], tickets],
    ['disputas', ['id', 'pedido_id', 'criador_id', 'tipo_reclamante', 'categoria', 'descricao', 'evidencias', 'status', 'resposta_outra_parte', 'resolucao', 'resultado', 'motivo_resolucao', 'operador_responsavel_id', 'criado_em', 'respondido_em', 'resolvido_em'], disputas],
    ['denuncias_produtos', ['id', 'produto_id', 'restaurante_id', 'cliente_id', 'produto_nome', 'motivo', 'detalhe', 'status', 'resposta', 'created_at', 'updated_at'], denuncias],
    ['relatorios_cache', ['id', 'tipo', 'periodo', 'dados', 'data_referencia', 'created_at'], relatorios],
  ]

  for (const [table, columns, rows] of plan) {
    await bulkUpsert(table, columns, rows)
    console.log(`- ${table}: ${rows.length} registros fake inseridos/atualizados`)
  }

  await updateAggregates()

  console.log('Seed finalizado com sucesso.')
  console.log(`Senha fake para clientes, gerentes, operadores e entregadores: ${PASSWORD_FAKE}`)
  process.exit(0)
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Erro ao executar seed:', error)
    process.exit(1)
  })
}
