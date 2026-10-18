import { isoDe, medida, rotulo } from './pneus';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dados de exemplo para o modo demonstração: 10 pneus e 6 meses de histórico.
export function dadosDeExemplo(agora = new Date()) {
  const rnd = mulberry32(20261018);
  const sortear = (arr) => arr[Math.floor(rnd() * arr.length)];

  const tires = [
    ['Pirelli', 'Cinturato P1', 175, 70, 14, 84, 'T', 24, 8, 289, 389],
    ['Michelin', 'Primacy 4', 205, 55, 16, 91, 'V', 12, 6, 589, 769],
    ['Goodyear', 'Assurance MaxLife', 185, 65, 15, 88, 'H', 5, 8, 379, 499],
    ['Bridgestone', 'Turanza ER300', 195, 55, 15, 85, 'H', 16, 6, 409, 549],
    ['Continental', 'PowerContact 2', 175, 65, 14, 82, 'T', 3, 6, 299, 399],
    ['Firestone', 'F-600', 165, 70, 13, 79, 'T', 30, 10, 219, 299],
    ['Pirelli', 'Scorpion ATR', 265, 70, 16, 112, 'T', 8, 4, 899, 1189],
    ['Dunlop', 'SP Touring R1', 185, 60, 15, 84, 'H', 0, 4, 329, 439],
    ['XBRI', 'Ecology', 195, 60, 15, 88, 'H', 20, 8, 249, 339],
    ['Michelin', 'LTX Force', 225, 65, 17, 102, 'T', 6, 4, 789, 1029],
  ].map(([marca, modelo, largura, perfil, aro, carga, vel, qtd, min, custo, preco]) => ({
    id: uid(), marca, modelo, largura, perfil, aro, carga, vel, qtd, min, custo, preco,
  }));

  const movs = [];
  const desp = [];
  const letras = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';
  const placa = () => {
    const l = () => letras[Math.floor(rnd() * letras.length)];
    const n = () => Math.floor(rnd() * 10);
    return `${l()}${l()}${l()}${n()}${l()}${n()}${n()}`;
  };
  const clientes = ['Cliente balcão', 'Auto Center Vila Nova', 'Frota Transportes Lima', 'Táxi', 'Cliente balcão', 'Oficina do Marcão', 'Cliente balcão'];
  let nf = 48120;

  for (let k = 5; k >= 0; k--) {
    const base = new Date(agora.getFullYear(), agora.getMonth() - k, 1);
    const Y = base.getFullYear();
    const M = base.getMonth();
    const diasNoMes = new Date(Y, M + 1, 0).getDate();
    const ultimoDia = k === 0 ? agora.getDate() : diasNoMes;
    const dia = () => 1 + Math.floor(rnd() * ultimoDia);
    const d = (dd) => isoDe(new Date(Y, M, Math.min(dd, diasNoMes)));

    const entradas = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < entradas; i++) {
      const t = sortear(tires);
      const q = sortear([8, 10, 12, 16]);
      const data = d(dia());
      const id = uid();
      movs.push({ id, tipo: 'entrada', pneu_id: t.id, rotulo: rotulo(t), qtd: q, valor: t.custo, data, obs: `NF ${nf++} · Distribuidora Rota Sul` });
      desp.push({ id: uid(), data, descricao: `Compra ${q}× ${medida(t)} ${t.marca}`, categoria: 'Compra de pneus', valor: q * t.custo, pago: true, mov_id: id });
    }

    const saidas = Math.max(2, Math.round((13 + rnd() * 9) * (ultimoDia / diasNoMes)));
    let receita = 0;
    for (let i = 0; i < saidas; i++) {
      const t = sortear(tires);
      const q = sortear([1, 2, 2, 2, 4, 4]);
      movs.push({ id: uid(), tipo: 'saida', pneu_id: t.id, rotulo: rotulo(t), qtd: q, valor: t.preco, data: d(dia()), obs: `${sortear(clientes)} · placa ${placa()}` });
      receita += q * t.preco;
    }

    const fixas = [
      ['Aluguel do galpão', 'Aluguel', 3200, 5],
      ['Folha de pagamento (2 funcionários)', 'Salários', 5400, 5],
      ['Energia elétrica', 'Energia e água', Math.round((470 + rnd() * 170) * 100) / 100, 12],
      ['Água e esgoto', 'Energia e água', Math.round((85 + rnd() * 40) * 100) / 100, 12],
      ['Internet e telefone', 'Outros', 149.9, 10],
      ['DAS · Simples Nacional', 'Impostos', Math.round(receita * 0.06 * 100) / 100, 20],
    ];
    fixas.forEach(([descricao, categoria, valor, venc]) => {
      desp.push({ id: uid(), data: d(venc), descricao, categoria, valor, pago: !(k === 0 && venc > agora.getDate()), mov_id: null });
    });
    if (k === 3) desp.push({ id: uid(), data: d(17), descricao: 'Reparo do compressor de ar', categoria: 'Manutenção de equipamentos', valor: 680, pago: true, mov_id: null });
    if (k === 1) desp.push({ id: uid(), data: d(9), descricao: 'Pesos de balanceamento e válvulas', categoria: 'Manutenção de equipamentos', valor: 312.4, pago: true, mov_id: null });
    if (rnd() > 0.4) desp.push({ id: uid(), data: d(dia()), descricao: 'Frete de mercadoria', categoria: 'Frete', valor: Math.round(120 + rnd() * 160), pago: true, mov_id: null });
  }

  return { tires, movs, desp };
}

export { uid };
