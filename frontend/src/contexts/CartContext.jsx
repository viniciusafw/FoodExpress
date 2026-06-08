/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

function lerCarrinhoPersistido() {
  if (typeof window === 'undefined') return [];
  try {
    const salvo = JSON.parse(localStorage.getItem('carrinho') || '[]');
    return Array.isArray(salvo) ? salvo : [];
  } catch {
    localStorage.removeItem('carrinho');
    return [];
  }
}

function getRestauranteId(item) {
  const id = item?.restauranteId || item?.restaurante_id || item?.loja?.id || item?.restaurantId;
  return id == null || id === '' ? '' : String(id);
}

export function CartProvider({ children }) {
  const [itens, setItens] = useState(() => {
    return lerCarrinhoPersistido();
  });
  const [carregando] = useState(false);

  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(itens));
  }, [itens]);

  const adicionarItem = (item) => {
    const restauranteAtual = getRestauranteId(itens[0]);
    const restauranteNovo = getRestauranteId(item);
    if (restauranteAtual && restauranteNovo && restauranteAtual !== restauranteNovo) {
      alert('Você só pode adicionar itens de um restaurante por vez. Limpe o carrinho para trocar de restaurante.');
      return false;
    }

    setItens((anterior) => {
      const existente = anterior.find((i) => i.id === item.id);
      if (existente) {
        return anterior.map((i) =>
          i.id === item.id ? { ...i, quantidade: Math.min(500, Number(i.quantidade || 0) + Number(item.quantidade || 1)) } : i
        );
      }
      // Garante que restauranteId seja preservado para o checkout
      return [...anterior, { ...item, restauranteId: restauranteNovo || item.restauranteId, quantidade: Math.min(500, Math.max(1, Number(item.quantidade || 1))) }];
    });
    window.setTimeout(() => {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent('foodexpress:carrinho-item-adicionado', { detail: { item } }));
    }, 0);
    return true;
  };

  const removerItem = (id) => {
    setItens((anterior) => anterior.filter((item) => item.id !== id));
  };

  const alterarQuantidade = (id, quantidade) => {
    const proximaQuantidade = Number(quantidade);
    setItens((anterior) => anterior
      .map((item) => {
        if (item.id !== id) return item;
        return { ...item, quantidade: Math.max(0, Math.min(500, proximaQuantidade)) };
      })
      .filter((item) => item.quantidade > 0)
    );
  };

  const incrementarItem = (id) => {
    setItens((anterior) => anterior.map((item) => (
      item.id === id
        ? { ...item, quantidade: Math.min(500, Number(item.quantidade || 1) + 1) }
        : item
    )));
  };

  const decrementarItem = (id) => {
    setItens((anterior) => anterior.map((item) => (
        item.id === id
          ? { ...item, quantidade: Math.max(1, Number(item.quantidade || 1) - 1) }
          : item
      )));
  };

  const limparCarrinho = () => setItens([]);

  const quantidadeTotal = itens.reduce((soma, item) => soma + item.quantidade, 0);
  const totalCarrinho = itens.reduce(
    (soma, item) => soma + (item.preco || item.price || 0) * item.quantidade,
    0
  );

  const valor = {
    itens,
    adicionarItem,
    removerItem,
    alterarQuantidade,
    incrementarItem,
    decrementarItem,
    limparCarrinho,
    quantidadeTotal,
    totalCarrinho,
    carregando,
  };

  return <CartContext.Provider value={valor}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider');
  return context;
};
