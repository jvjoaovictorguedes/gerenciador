import { useState } from 'react';
import { brl, CATEGORIAS, dataBR, hoje, mesDe, nomeMes, porDataDesc, somarMeses, totaisDoMes } from '../lib/pneus';

export default function Financeiro({ dados, mes, onMes, onAdicionar, onMarcarPago, onExcluir }) {
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [pago, setPago] = useState(true);
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);

  const t = totaisDoMes(dados, mes);
  const anterior = totaisDoMes(dados, somarMeses(mes, -1));
  const variacao = anterior.vendas ? ((t.vendas - anterior.vendas) / anterior.vendas) * 100 : null;
  const despesas = dados.desp.filter((d) => mesDe(d.data) === mes).sort(porDataDesc);

  const porCategoria = Object.entries(despesas.reduce((acc, d) => ({ ...acc, [d.categoria]: (acc[d.categoria] || 0) + d.valor }), {})).sort((a, b) => b[1] - a[1]);
  const maior = porCategoria.length ? porCategoria[0][1] : 1;

  async function enviar(e) {
    e.preventDefault();
    const v = parseFloat(valor);
    if (!descricao.trim()) return setMsg('Descreva a despesa.');
    if (!(v > 0)) return setMsg('Informe um valor maior que zero.');
    setEnviando(true);
    setMsg('');
    try {
      await onAdicionar({ descricao: descricao.trim(), categoria, valor: v, data: data || hoje(), pago });
      setDescricao('');
      setValor('');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Controle financeiro</h2>
          <p>Vendas vêm das saídas do estoque. Despesas você lança aqui ou pelas entradas.</p>
        </div>
        <div className="month-nav">
          <button onClick={() => onMes(somarMeses(mes, -1))} aria-label="Mês anterior">‹</button>
          <strong>{nomeMes(mes)}</strong>
          <button onClick={() => onMes(somarMeses(mes, 1))} aria-label="Próximo mês">›</button>
        </div>
      </div>

      <div className="kpis">
        <div className="card kpi">
          <span className="kpi-label">Vendas</span>
          <span className="kpi-value pos">{brl(t.vendas)}</span>
          <span className="kpi-sub">{t.pneusVendidos} pneus vendidos{variacao !== null && ` · ${variacao >= 0 ? '+' : ''}${variacao.toFixed(0)}% vs. mês anterior`}</span>
        </div>
        <div className="card kpi">
          <span className="kpi-label">Despesas</span>
          <span className="kpi-value neg">{brl(t.despesas)}</span>
          <span className="kpi-sub">{t.lancamentos} lançamento(s)</span>
        </div>
        <div className={'card kpi ' + (t.saldo >= 0 ? 'is-good' : 'is-bad')}>
          <span className="kpi-label">Saldo do mês</span>
          <span className="kpi-value">{(t.saldo < 0 ? '−' : '') + brl(Math.abs(t.saldo))}</span>
          <span className="kpi-sub">vendas menos despesas</span>
        </div>
        <div className={'card kpi ' + (t.aPagar ? '' : 'is-good')}>
          <span className="kpi-label">A pagar</span>
          <span className="kpi-value" style={t.aPagar ? { color: 'var(--warn)' } : undefined}>{brl(t.aPagar)}</span>
          <span className="kpi-sub">despesas pendentes</span>
        </div>
      </div>

      <div className="grid-main">
        <div className="card">
          <div className="card-head"><h3>Despesas do mês</h3><small>{despesas.length ? `${despesas.length} lançamento(s)` : ''}</small></div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table style={{ minWidth: 600 }}>
              <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th className="r">Valor</th><th>Status</th><th className="r" /></tr></thead>
              <tbody>
                {despesas.length ? despesas.map((d) => (
                  <tr key={d.id}>
                    <td>{dataBR(d.data)}</td>
                    <td>{d.descricao}{d.mov_id && <> <span className="pill neutral" title="Gerada por uma entrada de estoque">estoque</span></>}</td>
                    <td className="muted">{d.categoria}</td>
                    <td className="r">{brl(d.valor)}</td>
                    <td><button className={'pill status-btn ' + (d.pago ? 'good' : 'warn')} onClick={() => onMarcarPago(d)} title="Clique para alterar">{d.pago ? 'Paga' : 'Pendente'}</button></td>
                    <td className="r"><button className="btn-link danger" onClick={() => onExcluir(d)}>Excluir</button></td>
                  </tr>
                )) : <tr><td colSpan="6" className="empty">Nenhuma despesa neste mês. Use o formulário ao lado para lançar.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
          <form className="card card-pad" onSubmit={enviar} noValidate>
            <h3 style={{ marginBottom: 12 }}>Nova despesa</h3>
            <div className="form-grid">
              <label className="field span-2">Descrição
                <input type="text" id="despDesc" maxLength="80" placeholder="Ex.: Conta de luz de outubro" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
              </label>
              <label className="field">Categoria
                <select id="despCat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="field">Valor (R$)
                <input type="number" id="despValor" min="0" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              </label>
              <label className="field">Data / vencimento
                <input type="date" id="despData" value={data} onChange={(e) => setData(e.target.value)} />
              </label>
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <label className="check" style={{ paddingBottom: 10 }}><input type="checkbox" id="despPago" checked={pago} onChange={(e) => setPago(e.target.checked)} /> Já está paga</label>
              </div>
            </div>
            <div className="form-foot">
              <span className="form-msg" role="alert">{msg}</span>
              <button className="btn btn-primary" type="submit" disabled={enviando}>{enviando ? 'Lançando…' : 'Lançar despesa'}</button>
            </div>
          </form>

          <div className="card">
            <div className="card-head"><h3>Por categoria</h3><small>{t.despesas ? brl(t.despesas) : ''}</small></div>
            <div className="cat-bars">
              {porCategoria.length ? porCategoria.map(([c, v]) => (
                <div className="cat-row" key={c}>
                  <span>{c}</span>
                  <span className="num">{brl(v)} <span className="muted">· {((v / t.despesas) * 100).toFixed(0)}%</span></span>
                  <div className="track"><i style={{ width: (v / maior) * 100 + '%' }} /></div>
                </div>
              )) : <p className="muted" style={{ margin: 0 }}>Sem despesas para comparar.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
