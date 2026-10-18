import Grafico from './Grafico';
import { brl, brlCurto, dataBR, hoje, inteiro, medida, mesDe, nomeMes, porDataDesc, situacao, SITUACAO_TEXTO, somarMeses, totaisDoMes } from '../lib/pneus';

export default function Painel({ dados, onMovimentar, onAba }) {
  const { tires, movs } = dados;
  const mesAtual = mesDe(hoje());
  const totalUn = tires.reduce((a, t) => a + t.qtd, 0);
  const valorCusto = tires.reduce((a, t) => a + t.qtd * t.custo, 0);
  const valorVenda = tires.reduce((a, t) => a + t.qtd * t.preco, 0);
  const baixos = tires.filter((t) => t.qtd < t.min).sort((a, b) => a.qtd / (a.min || 1) - b.qtd / (b.min || 1));
  const atual = totaisDoMes(dados, mesAtual);
  const meses = [5, 4, 3, 2, 1, 0].map((i) => {
    const chave = somarMeses(mesAtual, -i);
    return { chave, ...totaisDoMes(dados, chave) };
  });
  const recentes = [...movs].sort(porDataDesc).slice(0, 6);

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Resumo da loja</h2>
          <p>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-in" onClick={() => onMovimentar('entrada')}>+ Registrar entrada</button>
          <button className="btn btn-out" onClick={() => onMovimentar('saida')}>− Registrar saída</button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="kpi-label">Pneus em estoque</span>
          <span className="kpi-value">{inteiro(totalUn)}</span>
          <span className="kpi-sub">{tires.length} medidas/modelos cadastrados</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Valor do estoque</span>
          <span className="kpi-value">{brlCurto(valorCusto)}</span>
          <span className="kpi-sub">a custo · {brl(valorVenda)} a preço de venda</span>
        </div>
        <div className={'card kpi ' + (baixos.length ? 'is-bad' : 'is-good')}>
          <span className="kpi-label">Abaixo do mínimo</span>
          <span className="kpi-value">{baixos.length}</span>
          <span className="kpi-sub">{baixos.filter((t) => t.qtd <= 0).length} zerado(s)</span>
        </div>
        <div className={'card kpi ' + (atual.saldo >= 0 ? 'is-good' : 'is-bad')}>
          <span className="kpi-label">Saldo de {nomeMes(mesAtual, { month: 'long' }).toLowerCase()}</span>
          <span className="kpi-value">{(atual.saldo < 0 ? '−' : '') + brlCurto(Math.abs(atual.saldo))}</span>
          <span className="kpi-sub">{brl(atual.vendas)} em vendas · {brl(atual.despesas)} em despesas</span>
        </div>
      </div>

      <div className="grid-main">
        <div className="card">
          <div className="card-head"><h3>Vendas × despesas</h3><small>últimos 6 meses</small></div>
          <div className="legend" style={{ marginTop: 8 }}>
            <span><i style={{ background: 'var(--good)' }} />Vendas (saídas)</span>
            <span><i style={{ background: 'var(--bad)' }} />Despesas</span>
          </div>
          <div className="chart"><Grafico meses={meses} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Repor estoque</h3><small>{baixos.length ? `${baixos.length} item(ns)` : ''}</small></div>
          <ul className="list">
            {baixos.length ? baixos.map((t) => (
              <li key={t.id}>
                <span className={'pill ' + situacao(t)}>{SITUACAO_TEXTO[situacao(t)]}</span>
                <div className="grow">
                  <b className="size">{medida(t)}</b>
                  <span>{t.marca} {t.modelo} · {t.qtd} un. (mín. {t.min})</span>
                </div>
                <button className="btn btn-sm btn-in" onClick={() => onMovimentar('entrada', t.id)}>+ Entrada</button>
              </li>
            )) : <li className="muted" style={{ justifyContent: 'center', padding: 24 }}>Tudo acima do estoque mínimo.</li>}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Últimas movimentações</h3><button className="btn-link" onClick={() => onAba('movs')}>Ver todas →</button></div>
        <ul className="list">
          {recentes.length ? recentes.map((m) => {
            const [med, desc] = m.rotulo.split(' · ');
            return (
              <li key={m.id}>
                <span className={'dot ' + (m.tipo === 'entrada' ? 'in' : 'out')} aria-label={m.tipo}>{m.tipo === 'entrada' ? '↓' : '↑'}</span>
                <div className="grow">
                  <b>{m.tipo === 'entrada' ? '+' : '−'}{m.qtd} · <span className="size" style={{ display: 'inline', color: 'inherit' }}>{med}</span></b>
                  <span>{dataBR(m.data)} · {desc} · {m.obs}</span>
                </div>
                <span className={'amt ' + (m.tipo === 'saida' ? 'pos' : '')}>{brl(m.qtd * m.valor)}</span>
              </li>
            );
          }) : <li className="muted" style={{ justifyContent: 'center', padding: 24 }}>Nenhuma movimentação ainda. Registre a primeira entrada.</li>}
        </ul>
      </div>
    </section>
  );
}
