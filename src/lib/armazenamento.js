// Duas formas de guardar os dados, com a mesma interface:
// - Supabase, quando REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY estão configurados;
// - navegador (localStorage), como modo demonstração, quando não estão.
import { createClient } from '@supabase/supabase-js';
import { dadosDeExemplo, uid } from './exemplo';
import { medida, rotulo, hoje } from './pneus';

const url = process.env.REACT_APP_SUPABASE_URL;
const chave = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = url && chave ? createClient(url, chave) : null;
export const modoDemo = !supabase;

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
  if (error) throw new Error(error.message || 'Não foi possível falar com o banco de dados.');
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
};

export const armazenamento = modoDemo ? armazenamentoLocal : armazenamentoSupabase;
export { armazenamentoLocal };
