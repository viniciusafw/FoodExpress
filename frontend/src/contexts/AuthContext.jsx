/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import api, { getApiBaseUrl } from '../services/api';

const AuthContext = createContext();
const GOOGLE_PASSWORD_PENDING_KEY = 'foodexpress.googlePasswordPending';

function lerUsuarioPersistido() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null');
  } catch {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    return null;
  }
}

function normalizarIdentificador(valor) {
  return String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'usuario'
}

function idEstavelPorEmail(email, perfil) {
  return `${perfil}-${normalizarIdentificador(email)}`
}

async function criarTokenBackend(usuario) {
  const data = await api.auth.criarSessao({
    userId: usuario.id,
    perfil: usuario.perfil,
    email: usuario.email,
    nome: usuario.nome,
    cadastro: Boolean(usuario.cadastro),
    senha: usuario.senha || usuario.password || '',
  })
  return data.token
}

async function enviarCodigoLoginPorEmail(email, perfil = 'cliente') {
  const emailLimpo = String(email || '').trim()
  if (!emailLimpo) throw new Error('E-mail obrigatório para login.')
  return api.auth.login({ email: emailLimpo, perfil })
}

function destinoPorPerfil(perfil) {
  return { cliente: '/', gerente: '/gerente', entregador: '/entregador', restaurante: '/painel-restaurante', operador: '/admin' }[perfil] ?? '/'
}

export function AuthProvider({ children }) {
  const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const auth0Configurado = Boolean(auth0Domain && auth0ClientId);
  const {
    user: auth0User,
    isAuthenticated,
    isLoading: auth0Loading,
    loginWithRedirect,
    logout: auth0Logout,
  } = useAuth0();

  const [usuario, setUsuario] = useState(() => {
    return lerUsuarioPersistido();
  });
  const [carregando] = useState(false);
  const [auth0Sincronizado, setAuth0Sincronizado] = useState(() => !auth0Configurado);
  const ultimaContaAuth0Sincronizada = useRef(null);
  const navigate = useNavigate();
  const auth0Sub = auth0User?.sub || '';
  const auth0Email = auth0User?.email || '';
  const auth0Name = auth0User?.name || '';

  useEffect(() => {
    if (!auth0Configurado) {
      setAuth0Sincronizado(true);
      return;
    }

    if (auth0Loading) return;

    if (
      localStorage.getItem('preferLocalAuth') === 'true' &&
      localStorage.getItem('token') &&
      localStorage.getItem('usuario')
    ) {
      setAuth0Sincronizado(true);
      return;
    }

    if (!isAuthenticated || !auth0Sub) {
      ultimaContaAuth0Sincronizada.current = null;
      setAuth0Sincronizado(true);
      return;
    }

    const chaveContaAuth0 = `${auth0Sub}|${auth0Email}|${auth0Name}`;
    if (ultimaContaAuth0Sincronizada.current === chaveContaAuth0) {
      setAuth0Sincronizado(true);
      return;
    }

    sessionStorage.setItem(GOOGLE_PASSWORD_PENDING_KEY, JSON.stringify({
      sub: auth0Sub,
      email: auth0Email,
      nome: auth0Name,
      chave: chaveContaAuth0,
    }));
    setAuth0Sincronizado(true);
    navigate('/login?googleSenha=true', { replace: true });
    return;
  }, [auth0Configurado, auth0Loading, isAuthenticated, auth0Sub, auth0Email, auth0Name, navigate]);

  const entrar = async (email, perfil, extras = {}) => {
    const novoUsuario = {
      id: idEstavelPorEmail(email, perfil),
      nome: extras.nome || email.split('@')[0] || perfil,
      email,
      telefone: extras.telefone || '',
      veiculo_tipo: extras.veiculo_tipo || extras.veiculo || '',
      veiculo_placa: extras.veiculo_placa || extras.placa || '',
      perfil,
      cadastro: Boolean(extras.cadastro),
      senha: extras.senha || extras.password || '',
    }
    localStorage.setItem('preferLocalAuth', 'true')
    let token
    try {
      token = await criarTokenBackend(novoUsuario)
    } catch (error) {
      localStorage.removeItem('preferLocalAuth')
      throw error
    }
    const { senha: _senha, password: _password, ...usuarioPersistivel } = novoUsuario
    localStorage.setItem('usuario', JSON.stringify(usuarioPersistivel))
    localStorage.setItem('token', token)
    setUsuario(usuarioPersistivel)

    if (perfil === 'gerente') {
      api.restaurantes.meuRestauranteOuCriar(usuarioPersistivel.email, 'Minha Loja')
        .catch(err => console.warn('Restaurante será criado no próximo acesso:', err))
    }

    if (perfil === 'entregador' && novoUsuario.cadastro) {
      await api.entregadores.cadastrarInicial({
        nome: usuarioPersistivel.nome,
        email: usuarioPersistivel.email,
        telefone: usuarioPersistivel.telefone,
        veiculo_tipo: usuarioPersistivel.veiculo_tipo || 'moto',
        veiculo_placa: usuarioPersistivel.veiculo_placa || '',
        senha: novoUsuario.senha,
      }).catch(err => console.warn('Entregador será criado no próximo acesso:', err))
    }

    navigate(destinoPorPerfil(perfil))
  }

  const aplicarSessao = (token, dadosUsuario = {}) => {
    if (!token) throw new Error('Token de sessão não informado.')
    const usuarioSessao = {
      id: dadosUsuario.id,
      nome: dadosUsuario.nome || dadosUsuario.name || dadosUsuario.email?.split('@')[0] || 'Usuário',
      email: dadosUsuario.email || '',
      telefone: dadosUsuario.telefone || '',
      perfil: dadosUsuario.perfil || 'cliente',
    }

    if (!usuarioSessao.id) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        usuarioSessao.id = payload.userId
        usuarioSessao.perfil = payload.role || usuarioSessao.perfil
        usuarioSessao.email = payload.email || usuarioSessao.email
        usuarioSessao.nome = payload.nome || usuarioSessao.nome
      } catch {
        usuarioSessao.id = `${usuarioSessao.perfil}-${normalizarIdentificador(usuarioSessao.email || usuarioSessao.telefone)}`
      }
    }

    localStorage.setItem('usuario', JSON.stringify(usuarioSessao))
    localStorage.setItem('token', token)
    localStorage.setItem('preferLocalAuth', 'true')
    setUsuario(usuarioSessao)
    navigate(destinoPorPerfil(usuarioSessao.perfil), { replace: true })
  }

  const entrarComGoogle = async () => {
    if (!auth0Configurado) {
      throw new Error('Auth0 não configurado. Defina VITE_AUTH0_DOMAIN e VITE_AUTH0_CLIENT_ID.');
    }

    sessionStorage.removeItem(GOOGLE_PASSWORD_PENDING_KEY);
    localStorage.removeItem('preferLocalAuth');
    await loginWithRedirect({
      appState: { returnTo: '/' },
      authorizationParams: {
        connection: 'google-oauth2',
        prompt: 'login',
        redirect_uri: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const concluirLoginGoogleComSenha = async (senha) => {
    const raw = sessionStorage.getItem(GOOGLE_PASSWORD_PENDING_KEY);
    const pendente = raw ? JSON.parse(raw) : {};
    const email = pendente.email || auth0Email;
    const nome = pendente.nome || auth0Name;
    const chave = pendente.chave || `${auth0Sub}|${auth0Email}|${auth0Name}`;

    if (!email) throw new Error('Não encontramos o e-mail retornado pelo Google. Tente entrar com Google novamente.');

    const response = await fetch(`${getApiBaseUrl()}/api/auth/auth0-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome, senha }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.erro || 'Não foi possível concluir o login com Google.');
    }

    const data = await response.json();
    if (data?.token) localStorage.setItem('token', data.token);

    const usuarioCliente = {
      id: data?.usuario?.id || pendente.sub || auth0Sub,
      nome: data?.usuario?.nome || nome || (email ? email.split('@')[0] : 'Cliente'),
      email: data?.usuario?.email || email,
      telefone: data?.usuario?.telefone || '',
      perfil: 'cliente',
      provider: 'auth0',
    };

    localStorage.setItem('usuario', JSON.stringify(usuarioCliente));
    localStorage.setItem('preferLocalAuth', 'true');
    sessionStorage.removeItem(GOOGLE_PASSWORD_PENDING_KEY);
    ultimaContaAuth0Sincronizada.current = chave;
    setUsuario(usuarioCliente);
    setAuth0Sincronizado(true);
    navigate(destinoPorPerfil('cliente'), { replace: true });
  };

  const cadastrarCliente = async (dados) => {
    return api.auth.registrar({
      nome: dados.nome || dados.name,
      email: dados.email,
      telefone: dados.telefone || dados.phone,
      senha: dados.senha || dados.password,
      endereco: dados.endereco || dados.endereco_principal || '',
      endereco_label: dados.endereco_label || dados.enderecoLabel || '',
      latitude: dados.latitude ?? null,
      longitude: dados.longitude ?? null,
    })
  };

  const cadastrarGerente = async (dados) => {
    const novoUsuario = {
      id: idEstavelPorEmail(dados.emailDono || dados.ownerEmail || dados.email || dados.nomeDono || 'gerente', 'gerente'),
      nome: dados.nomeDono || dados.ownerName,
      email: dados.emailDono || dados.ownerEmail,
      telefone: dados.telefoneDono || dados.ownerPhone,
      perfil: 'gerente',
      cadastro: true,
      senha: dados.senha || dados.password || '',
      loja: {
        nome: dados.nomeLoja || dados.storeName,
        nomeFicticio: dados.nomeFicticio || dados.storeFantasyName || dados.fantasia || dados.nomeFantasia,
        endereco: dados.enderecoLoja || dados.storeAddress,
        telefone: dados.telefoneLoja || dados.storePhone,
        cnpj: dados.cnpjLoja || dados.storeCnpj,
        categoria: dados.categoria || 'Geral',
        descricao: dados.descricao || '',
      },
    };
    const token = await criarTokenBackend(novoUsuario)
    const { senha: _senha, password: _password, ...usuarioPersistivel } = novoUsuario
    localStorage.setItem('usuario', JSON.stringify(usuarioPersistivel));
    localStorage.setItem('token', token);
    setUsuario(usuarioPersistivel);

    try {
      await api.restaurantes.cadastroInicial({
        email: usuarioPersistivel.email,
        nome: usuarioPersistivel.loja.nome || usuarioPersistivel.nome,
        nomeFicticio: usuarioPersistivel.loja.nomeFicticio,
        cnpj: usuarioPersistivel.loja.cnpj,
        telefone: usuarioPersistivel.loja.telefone,
        endereco: usuarioPersistivel.loja.endereco,
        categoria: usuarioPersistivel.loja.categoria || 'Geral',
        descricao: usuarioPersistivel.loja.descricao || '',
        ownerName: usuarioPersistivel.nome,
        ownerEmail: usuarioPersistivel.email,
        ownerPhone: usuarioPersistivel.telefone,
        ownerCpf: dados.cpfDono || dados.ownerCpf || '',
        senha: novoUsuario.senha,
      })
    } catch (error) {
      localStorage.removeItem('usuario');
      localStorage.removeItem('token');
      setUsuario(null);
      throw error;
    }

    navigate('/gerente');
  };

  const sair = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    localStorage.removeItem('preferLocalAuth');
    setUsuario(null);

    if (usuario?.provider === 'auth0' && auth0Configurado) {
      auth0Logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
      return;
    }

    navigate('/login');
  };

  const atualizarUsuario = (dados = {}) => {
    setUsuario(atual => {
      if (!atual) return atual
      const atualizado = { ...atual, ...dados }
      localStorage.setItem('usuario', JSON.stringify(atualizado))
      return atualizado
    })
  }

  useEffect(() => {
    const encerrarSessaoExpirada = () => {
      setUsuario(null)
      navigate('/login?session=expired', { replace: true })
    }
    window.addEventListener('foodexpress:sessao-expirada', encerrarSessaoExpirada)
    return () => window.removeEventListener('foodexpress:sessao-expirada', encerrarSessaoExpirada)
  }, [navigate])

  const valor = useMemo(() => ({
    usuario,
    entrar,
    aplicarSessao,
    entrarComGoogle,
    concluirLoginGoogleComSenha,
    entrarComEmail: enviarCodigoLoginPorEmail,
    cadastrarCliente,
    cadastrarGerente,
    atualizarUsuario,
    sair,
    estaLogado: !!usuario,
    perfil: usuario?.perfil ?? null,
    carregando: carregando || (auth0Configurado && (auth0Loading || !auth0Sincronizado)),
  }), [usuario, carregando, auth0Configurado, auth0Loading, auth0Sincronizado, auth0Email, auth0Name, auth0Sub]);

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
};
