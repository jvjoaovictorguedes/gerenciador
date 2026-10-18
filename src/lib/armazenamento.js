// Formas de guardar os dados, com a mesma interface:
// - Supabase, configurado pelas variáveis REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY
//   ou, na falta delas, pelo botão "Conectar ao Supabase" do próprio site (fica salvo no navegador);
// - banco do site publicado no Claude (armazenamentoClaude.js);
// - navegador (localStorage), como modo demonstração.
import { createClient } from '@supabase/supabase-js';
import { dadosDeExemplo, uid } from './exemplo';
import { medida, rotulo, hoje } from './pneus';
import { criarArmazenamentoClaude } from './armazenamentoClaude';

const CHAVE_CONFIG = 'gerenciador-supabase';

function configSalva() {
  try {
    const c = JSON.parse(localStorage.getItem(CHAVE_CONFIG) || 'null');
    if (c && c.url && c.chave) return { url: c.url, chave: c.chave, origem: 'navegador' };
  } catch (e) {
    // sem acesso ao armazenamento: segue sem configuração salva
  }
  return null;
}

export const configSupabase =
  process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_ANON_KEY
    ? { url: process.env.REACT_APP_SUPABASE_URL, chave: process.env.REACT_APP_SUPABASE_ANON_KEY, origem: 'ambiente' }
    : configSalva();

export const supabase = configSupabase ? createClient(configSupabase.url, configSupabase.chave) : null;

// Confere endereço, chave e tabelas antes de salvar a conexão feita pelo site.
export async function testarSupabase(urlDigitada, chaveDigitada) {
  const url = String(urlDigitada).trim().replace(/\/+$/, '');
  const chave = String(chaveDigitada).trim();
  if (!/^https:\/\/[^/\s]+$/.test(url)) throw new Error('A Project URL deve ser parecida com https://abcdefgh.supabase.co');
  if (chave.startsWith('sb_secret_') || papelDaChave(chave) === 'service_role') {
    throw new Error('Essa é a chave secreta. Use a chave anon public (ou publishable), que pode ficar no site.');
  }
  if (chave.length < 30) throw new Error('Cole a chave anon public completa.');
  let r;
  try {
    r = await createClient(url, chave, { auth: { persistSession: false } }).from('pneus').select('id').limit(1);
  } catch (e) {
    throw new Error('Não foi possível acessar esse endereço. Confira a Project URL.');
  }
  if (r.error) {
    const texto = `${r.error.message || ''} ${r.error.code || ''} ${r.error.hint || ''}`;
    if (/permission denied/i.test(texto)) return { url, chave }; // tabelas existem; os dados aparecem depois do login
    if (/PGRST205|42P01|does not exist|schema cache/i.test(texto)) throw new Error('Conectou, mas as tabelas não existem. Rode o arquivo supabase/schema.sql no SQL Editor do Supabase.');
    if (/api ?key|jwt|401|unauthorized/i.test(texto)) throw new Error('Chave inválida. Copie de novo a chave anon public do projeto.');
    if (/fetch|network/i.test(texto)) throw new Error('Não foi possível acessar esse endereço. Confira a Project URL.');
    throw new Error(r.error.message || 'Não foi possível conectar.');
  }
  return { url, chave };
}

function papelDaChave(chave) {
  try {
    return JSON.parse(atob(chave.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role;
  } catch (e) {
    return null;
  }
}

export function salvarConexaoSupabase({ url, chave }) {
  try {
    localStorage.setItem(CHAVE_CONFIG, JSON.stringify({ url, chave }));
  } catch (e) {
    throw new Error('Este navegador não deixou salvar a conexão. Saia da janela anônima e tente de novo.');
  }
}

export function esquecerConexaoSupabase() {
  try {
    localStorage.removeItem(CHAVE_CONFIG);
  } catch (e) {
    // nada salvo para apagar
  }
}

const CAMPOS_PNEU = ['marca', 'modelo', 'largura', 'perfil', 'aro', 'carga', 'vel', 'min', 'custo', 'preco'];

// O Supabase devolve numeric como número ou texto, dependendo da versão; normaliza aqui.
const normalizar = ({ tires, movs, desp }) => ({
  tires: tires.map((t) => ({ ...t, qtd: Number(t.qtd), min: Number(t.min), custo: Number(t.custo), preco: Number(t.preco) })),
  movs: movs.map((m) => ({ ...m, qtd: Number(m.qtd), valor: Number(m.valor) })),
  desp: desp.map((d) => ({ ...d, valor: Number(d.valor) })),
});

// ---------- modo demonstração (navegador) ----------
const CHAVE_LOCAL = 'gerenciador-pneus-v1';

function lerLocal() {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCAL);
    if (bruto) {
      const s = JSON.parse(bruto);
      if (s && Array.isArray(s.tires)) return s;
    }
  } catch (e) {
    // sem acesso ao armazenamento: segue com os dados de exemplo
  }
  const s = { ...dadosDeExemplo(), exemplo: true };
  gravarLocal(s);
  return s;
}

function gravarLocal(s) {
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(s));
  } catch (e) {
    // sem acesso ao armazenamento: os dados valem só até fechar a página
  }
}

// O que a pessoa cadastrou no modo demonstração (não os dados de exemplo), para enviar ao banco.
export function dadosProprios() {
  try {
    const s = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || 'null');
    if (s && !s.exemplo && Array.isArray(s.tires) && s.tires.length) return s;
  } catch (e) {
    // nada cadastrado neste navegador
  }
  return null;
}

let memoria = null;
const local = () => (memoria = memoria || lerLocal());
const salvar = () => gravarLocal(memoria);

const armazenamentoLocal = {
  async carregar() {
    // cópia, para a tela nunca segurar os mesmos objetos que são alterados aqui
    const s = JSON.parse(JSON.stringify(local()));
    return { tires: s.tires, movs: s.movs, desp: s.desp, exemplo: !!s.exemplo };
  },
  async salvarPneu(pneu) {
    const s = local();
    const valores = Object.fromEntries(CAMPOS_PNEU.map((c) => [c, pneu[c]]));
    if (pneu.id) Object.assign(s.tires.find((t) => t.id === pneu.id), valores);
    else s.tires.push({ id: uid(), ...valores, qtd: Math.max(0, pneu.qtd || 0) });
    salvar();
  },
  async excluirPneu(id) {
    const s = local();
    s.tires = s.tires.filter((t) => t.id !== id);
    s.movs.forEach((m) => {
      if (m.pneu_id === id) m.pneu_id = null;
    });
    salvar();
  },
  async registrarMovimentacao({ tipo, pneu_id, qtd, valor, data, obs, lancarDespesa }) {
    const s = local();
    const t = s.tires.find((x) => x.id === pneu_id);
    if (!t) throw new Error('Pneu não encontrado.');
    if (!(qtd > 0)) throw new Error('Quantidade precisa ser 1 ou mais.');
    if (tipo === 'saida' && t.qtd < qtd) throw new Error(`Estoque insuficiente: há ${t.qtd} un. de ${medida(t)}.`);
    t.qtd += tipo === 'entrada' ? qtd : -qtd;
    const mov = { id: uid(), tipo, pneu_id, rotulo: rotulo(t), qtd, valor, data: data || hoje(), obs: obs || '' };
    s.movs.push(mov);
    if (tipo === 'entrada' && lancarDespesa && qtd * valor > 0) {
      s.desp.push({ id: uid(), data: mov.data, descricao: `Compra ${qtd}× ${medida(t)} ${t.marca}`, categoria: 'Compra de pneus', valor: qtd * valor, pago: true, mov_id: mov.id });
    }
    salvar();
    return { ...mov, estoqueAtual: t.qtd };
  },
  async desfazerMovimentacao(id) {
    const s = local();
    const m = s.movs.find((x) => x.id === id);
    if (!m) throw new Error('Movimentação não encontrada.');
    const t = s.tires.find((x) => x.id === m.pneu_id);
    if (t) {
      if (m.tipo === 'entrada' && t.qtd < m.qtd) throw new Error(`Não dá para desfazer: só restam ${t.qtd} un. dessa entrada no estoque.`);
      t.qtd += m.tipo === 'entrada' ? -m.qtd : m.qtd;
    }
    s.movs = s.movs.filter((x) => x.id !== id);
    s.desp = s.desp.filter((d) => d.mov_id !== id);
    salvar();
  },
  async adicionarDespesa(d) {
    local().desp.push({ id: uid(), mov_id: null, ...d });
    salvar();
  },
  async marcarPago(id, pago) {
    local().desp.find((d) => d.id === id).pago = pago;
    salvar();
  },
  async excluirDespesa(id) {
    const s = local();
    s.desp = s.desp.filter((d) => d.id !== id);
    salvar();
  },
  async restaurarExemplo() {
    memoria = { ...dadosDeExemplo(), exemplo: true };
    salvar();
  },
  async apagarTudo() {
    memoria = { tires: [], movs: [], desp: [], exemplo: false };
    salvar();
  },
};

// ---------- Supabase ----------
const falhou = (error) => {
  if (!error) return;
  const tabela = /table '?public\.(\w+)/i.exec(error.message || '');
  if (error.code === 'PGRST205' || tabela) {
    throw new Error(`A tabela ${tabela ? tabela[1] : ''} não existe no Supabase. Rode o arquivo supabase/schema.sql inteiro no SQL Editor.`);
  }
  if (error.code === 'PGRST202') throw new Error('As funções de entrada e saída não existem no Supabase. Rode o arquivo supabase/schema.sql inteiro no SQL Editor.');
  throw new Error(error.message || 'Não foi possível falar com o banco de dados.');
};

// O Supabase devolve no máximo 1000 linhas por consulta; busca em páginas.
async function buscarTudo(tabela, ordem) {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await supabase.from(tabela).select('*').order(ordem, { ascending: false }).range(de, de + 999);
    falhou(error);
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
}

const armazenamentoSupabase = {
  async carregar() {
    const [tires, movs, desp] = await Promise.all([
      buscarTudo('pneus', 'criado_em'),
      buscarTudo('movimentacoes', 'data'),
      buscarTudo('despesas', 'data'),
    ]);
    return { ...normalizar({ tires, movs, desp }), exemplo: false };
  },
  async salvarPneu(pneu) {
    const valores = Object.fromEntries(CAMPOS_PNEU.map((c) => [c, pneu[c]]));
    const { error } = pneu.id
      ? await supabase.from('pneus').update(valores).eq('id', pneu.id)
      : await supabase.from('pneus').insert({ ...valores, qtd: Math.max(0, pneu.qtd || 0) });
    falhou(error);
  },
  async excluirPneu(id) {
    const { error } = await supabase.from('pneus').delete().eq('id', id);
    falhou(error);
  },
  async registrarMovimentacao({ tipo, pneu_id, qtd, valor, data, obs, lancarDespesa }) {
    const { data: mov, error } = await supabase.rpc('registrar_movimentacao', {
      p_tipo: tipo, p_pneu_id: pneu_id, p_qtd: qtd, p_valor: valor, p_data: data, p_obs: obs, p_lancar_despesa: !!lancarDespesa,
    });
    falhou(error);
    return mov;
  },
  async desfazerMovimentacao(id) {
    const { error } = await supabase.rpc('desfazer_movimentacao', { p_id: id });
    falhou(error);
  },
  async adicionarDespesa(d) {
    const { error } = await supabase.from('despesas').insert(d);
    falhou(error);
  },
  async marcarPago(id, pago) {
    const { error } = await supabase.from('despesas').update({ pago }).eq('id', id);
    falhou(error);
  },
  async excluirDespesa(id) {
    const { error } = await supabase.from('despesas').delete().eq('id', id);
    falhou(error);
  },
  // Envia ao banco o que foi cadastrado no modo demonstração.
  async importar({ tires, movs, desp }) {
    const novoId = {};
    const idDe = (antigo) => (antigo ? (novoId[antigo] = novoId[antigo] || crypto.randomUUID()) : null);
    const pneus = tires.map((t) => ({ id: idDe(t.id), ...Object.fromEntries(CAMPOS_PNEU.map((c) => [c, t[c]])), qtd: Math.max(0, t.qtd || 0) }));
    const vivos = new Set(tires.map((t) => t.id));
    const movimentacoes = movs.map((m) => ({
      id: idDe(m.id), tipo: m.tipo, pneu_id: vivos.has(m.pneu_id) ? idDe(m.pneu_id) : null, rotulo: m.rotulo, qtd: m.qtd, valor: m.valor, data: m.data, obs: m.obs || '',
    }));
    const movIds = new Set(movs.map((m) => m.id));
    const despesas = desp.filter((d) => d.valor > 0).map((d) => ({
      id: idDe(d.id), data: d.data, descricao: d.descricao, categoria: d.categoria, valor: d.valor, pago: !!d.pago, mov_id: movIds.has(d.mov_id) ? idDe(d.mov_id) : null,
    }));
    if (pneus.length) falhou((await supabase.from('pneus').insert(pneus)).error);
    if (movimentacoes.length) falhou((await supabase.from('movimentacoes').insert(movimentacoes)).error);
    if (despesas.length) falhou((await supabase.from('despesas').insert(despesas)).error);
    return { pneus: pneus.length, movimentacoes: movimentacoes.length, despesas: despesas.length };
  },
};

export { armazenamentoLocal };

// Decide onde os dados ficam, nesta ordem:
// 1. Supabase, se configurado (site hospedado na Cloudflare, por exemplo);
// 2. banco do site no Claude, quando aberto como site publicado no Claude;
// 3. navegador, como demonstração.
// Resolve { modo, api, usuario } com modo 'supabase' | 'claude' | 'sem-acesso' | 'demo'.
export async function iniciarArmazenamento() {
  if (supabase) return { modo: 'supabase', api: armazenamentoSupabase };
  const claude = typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function' ? window.claude : null;
  if (!claude) return { modo: 'demo', api: armazenamentoLocal };
  const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
  if (!db) return { modo: 'sem-acesso', api: armazenamentoLocal };
  const eu = user ? await user.me() : null;
  const podeEscrever = user ? await user.can('data.write') : null;
  return {
    modo: 'claude',
    api: criarArmazenamentoClaude(db, eu && eu.id),
    usuario: {
      id: eu && eu.id,
      nome: (eu && eu.name) || '',
      avatar: eu && eu.avatarUrl,
      dono: !!(eu && eu.isOwner),
      podeEscrever: podeEscrever !== false,
      nomes: async (ids) => (user ? user.profiles(ids) : {}),
    },
  };
}
