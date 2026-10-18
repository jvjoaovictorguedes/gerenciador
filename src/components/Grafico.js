import { brl, brlCurto, nomeMes } from '../lib/pneus';

// Barras agrupadas de vendas × despesas por mês, desenhadas numa escala só.
export default function Grafico({ meses }) {
  const max = Math.max(1000, ...meses.map((m) => Math.max(m.vendas, m.despesas)));
  const passo = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000].find((s) => max / s <= 4) || 250000;
  const topo = Math.ceil(max / passo) * passo;
  const W = 640, H = 240, L = 58, R = 10, T = 12, B = 30;
  const ih = H - T - B;
  const y = (v) => T + ih - (v / topo) * ih;
  const gw = (W - L - R) / meses.length;
  const bw = Math.min(26, gw * 0.3);
  const linhas = [];
  for (let v = 0; v <= topo; v += passo) linhas.push(v);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Vendas e despesas por mês">
      <g className="grid">
        {linhas.map((v) => <line key={v} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />)}
      </g>
      {meses.map((m, i) => {
        const cx = L + gw * i + gw / 2;
        const atual = i === meses.length - 1 ? ' bar-cur' : '';
        return (
          <g key={m.chave}>
            <rect className={'bar-in' + atual} x={cx - bw - 2} y={y(m.vendas)} width={bw} height={Math.max(0, T + ih - y(m.vendas))} rx="2">
              <title>{`Vendas ${nomeMes(m.chave)}: ${brl(m.vendas)}`}</title>
            </rect>
            <rect className={'bar-out' + atual} x={cx + 2} y={y(m.despesas)} width={bw} height={Math.max(0, T + ih - y(m.despesas))} rx="2">
              <title>{`Despesas ${nomeMes(m.chave)}: ${brl(m.despesas)}`}</title>
            </rect>
          </g>
        );
      })}
      <g className="axis">
        {linhas.map((v) => <text key={v} x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? '0' : brlCurto(v)}</text>)}
        {meses.map((m, i) => (
          <text key={m.chave} x={L + gw * i + gw / 2} y={H - 10} textAnchor="middle">
            {nomeMes(m.chave, { month: 'short' }).replace('.', '').toLowerCase()}
          </text>
        ))}
      </g>
    </svg>
  );
}
