/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [itens, setItens] = useState(() => {
    if (typeof window === 'undefined') return [];
    const carrinhoPersistido = localStorage.getItem('carrinho');
    return carrinhoPersistido ? JSON.parse(carrinhoPersistido) : [];
  });
  const [carregando] = useState(false);

  useEffect(() => {
    localStorage.setItem('carrinho', JSON.stringify(itens));
  }, [itens]);

  const adicionarItem = (item) => {
    setItens((anterior) => {
      const existente = anterior.find((i) => i.id === item.id);
      const restauranteAtual = anterior[0]?.restauranteId || anterior[0]?.restaurante_id || anterior[0]?.loja?.id;
      const restauranteNovo = item.restauranteId || item.restaurante_id || item.loja?.id;
      if (restauranteAtual && restauranteNovo && restauranteAtual !== restauranteNovo) {
        alert('Você só pode adicionar itens de um restaurante por vez. Limpe o carrinho para trocar de restaurante.');
        return anterior;
      }
      if (existente) {
        return anterior.map((i) =>
          i.id === item.id ? { ...i, quantidade: i.quantidade + (item.quantidade || 1) } : i
        );
      }
      // Garante que restauranteId seja preservado para o checkout
      return [...anterior, { ...item, quantidade: item.quantidade || 1 }];
    });
  };

  const removerItem = (id) => {
    setItens((anterior) => anterior.filter((item) => item.id !== id));
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
