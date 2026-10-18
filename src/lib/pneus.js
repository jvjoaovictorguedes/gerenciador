// Regras e formatação compartilhadas por todas as telas.

export const CATEGORIAS = [
  'Compra de pneus',
  'Aluguel',
  'Salários',
  'Energia e água',
  'Impostos',
  'Manutenção de equipamentos',
  'Frete',
  'Outros',
];

export const MARCAS = ['Pirelli', 'Michelin', 'Goodyear', 'Bridgestone', 'Continental', 'Firestone', 'Dunlop', 'XBRI', 'Kumho', 'Hankook'];

// Índice de velocidade → km/h máximo.
export const VELOCIDADE = { L: 120, M: 130, N: 140, P: 150, Q: 160, R: 170, S: 180, T: 190, H: 210, V: 240, W: 270, Y: 300 };

// Índice de carga 75..115 → kg por pneu.
const CARGA_KG = [387, 400, 412, 425, 437, 450, 462, 475, 487, 500, 515, 530, 545, 560, 580, 600, 615, 630, 650, 670, 690, 710, 730, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000, 1030, 1060, 1090, 1120, 1150, 1180, 1215];
export const cargaKg = (indice) => (indice >= 75 && indice <= 115 ? CARGA_KG[indice - 75] : null);

export const medida = (t) => `${t.largura}/${t.perfil} R${t.aro}`;
export const rotulo = (t) => `${medida(t)} · ${t.marca} ${t.modelo}`.trim();

export const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const brlCurto = (v) =>
  Math.abs(v) >= 1000
    ? 'R$ ' + (v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil'
    : 'R$ ' + Math.round(v);
export const inteiro = (v) => (Number(v) || 0).toLocaleString('pt-BR');

const pad = (n) => String(n).padStart(2, '0');
export const isoDe = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hoje = () => isoDe(new Date());
export const dataBR = (iso) => {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const mesDe = (iso) => String(iso).slice(0, 7);
export const nomeMes = (chave, opts = { month: 'long', year: 'numeric' }) => {
  const [y, m] = chave.split('-').map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', opts);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const somarMeses = (chave, n) => {
  const [y, m] = chave.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const situacao = (t) => (t.qtd <= 0 ? 'bad' : t.qtd < t.min ? 'warn' : 'good');
export const SITUACAO_TEXTO = { bad: 'Zerado', warn: 'Repor', good: 'OK' };

export const porDataDesc = (a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0);

export function totaisDoMes({ movs, desp }, chave) {
  const saidas = movs.filter((m) => m.tipo === 'saida' && mesDe(m.data) === chave);
  const ds = desp.filter((d) => mesDe(d.data) === chave);
  const vendas = saidas.reduce((a, m) => a + m.qtd * m.valor, 0);
  const despesas = ds.reduce((a, d) => a + d.valor, 0);
  return {
    vendas,
    despesas,
    saldo: vendas - despesas,
    aPagar: ds.filter((d) => !d.pago).reduce((a, d) => a + d.valor, 0),
    pneusVendidos: saidas.reduce((a, m) => a + m.qtd, 0),
    lancamentos: ds.length,
  };
}
