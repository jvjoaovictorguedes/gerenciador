import { useEffect, useMemo, useRef, useState } from 'react';
import { brl, dataBR, hoje, medida, porDataDesc, rotulo } from '../lib/pneus';

export default function Movimentacoes({ dados, nomes = {}, predefinido, onRegistrar, onDesfazer }) {
  const { tires, movs } = dados;
  const ordenados = useMemo(() => [...tires].sort((a, b) => a.aro - b.aro || a.largura - b.largura || a.perfil - b.perfil), [tires]);

  const [tipo, setTipo] = useState('entrada');
  const [pneuId, setPneuId] = useState('');
  const [qtd, setQtd] = useState('4');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState('');
  const [lancar, setLancar] = useState(true);
  const [msg, setMsg] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('');
  const formRef = useRef(null);
  const qtdRef = useRef(null);

  const pneu = tires.find((t) => t.id === pneuId) || ordenados[0];
  const entrada = tipo === 'entrada';
  const precoSugerido = (t, tp) => (t ? String(tp === 'entrada' ? t.custo : t.preco) : '');

  // Atalhos "+ Entrada" / "− Saída" vindos do Painel e do Estoque.
  useEffect(() => {
    if (!predefinido) return;
    const t = tires.find((x) => x.id === predefinido.pneuId) || pneu;
    setTipo(predefinido.tipo);
    if (t) setPneuId(t.id);
    const q = predefinido.tipo === 'entrada' ? 8 : Math.max(1, Math.min(4, t ? t.qtd : 4));
    setQtd(String(q));
    setValor(precoSugerido(t, predefinido.tipo));
    setMsg('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    qtdRef.current?.focus({ preventScroll: true });
    qtdRef.current?.select();
    // só reage a um novo atalho
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [predefinido]);

  // Primeiro preenchimento do valor sugerido.
  useEffect(() => {
    if (valor === '' && pneu) setValor(precoSugerido(pneu, tipo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pneu?.id]);

  const trocarTipo = (tp) => { setTipo(tp); setValor(precoSugerido(pneu, tp)); setMsg(''); };
  const trocarPneu = (id) => { setPneuId(id); setValor(precoSugerido(tires.find((t) => t.id === id), tipo)); setMsg(''); };

  const q = parseInt(qtd, 10) || 0;
  const total = q * (parseFloat(valor) || 0);

  async function enviar(e) {
    e.preventDefault();
    const v = parseFloat(valor);
    if (!pneu) return setMsg('Cadastre um pneu no Estoque primeiro.');
    if (!(q > 0)) return setMsg('Quantidade precisa ser 1 ou mais.');
    if (!(v >= 0)) return setMsg('Informe o valor unitário.');
    if (!entrada && q > pneu.qtd) return setMsg(`Estoque insuficiente: há ${pneu.qtd} un. de ${medida(pneu)}.`);
    setEnviando(true);
    setMsg('');
    try {
      await onRegistrar({
        tipo, pneu_id: pneu.id, qtd: q, valor: v, data: data || hoje(),
        obs: obs.trim() || (entrada ? 'Entrada manual' : 'Cliente balcão'),
        lancarDespesa: entrada && lancar,
      });
      setObs('');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const termo = busca.trim().toLowerCase();
  const lista = movs.filter((m) => (!filtro || m.tipo === filtro) && (!termo || `${m.rotulo} ${m.obs}`.toLowerCase().includes(termo))).sort(porDataDesc);

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Entradas e saídas</h2>
          <p>Entradas somam ao estoque; saídas descontam e contam como venda no financeiro.</p>
        </div>
      </div>

      <form className="card card-pad" ref={formRef} onSubmit={enviar} noValidate>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div className="seg" role="radiogroup" aria-label="Tipo de movimentação">
            <input type="radio" name="movTipo" id="movTipoIn" checked={entrada} onChange={() => trocarTipo('entrada')} />
            <label htmlFor="movTipoIn" className="in">↓ Entrada</label>
            <input type="radio" name="movTipo" id="movTipoOut" checked={!entrada} onChange={() => trocarTipo('saida')} />
            <label htmlFor="movTipoOut" className="out">↑ Saída</label>
          </div>
          {pneu && <span className="hint">{pneu.qtd} un. em estoque{!entrada && ` · depois da saída: ${Math.max(0, pneu.qtd - q)}`}</span>}
        </div>
        <div className="form-grid">
          <label className="field span-2">Pneu
            <select id="movPneu" value={pneu?.id || ''} onChange={(e) => trocarPneu(e.target.value)} disabled={!ordenados.length}>
              {ordenados.length
                ? ordenados.map((t) => <option key={t.id} value={t.id}>{rotulo(t)} — {t.qtd} em estoque</option>)
                : <option value="">Cadastre um pneu no Estoque primeiro</option>}
            </select>
          </label>
          <label className="field">Quantidade
            <input type="number" id="movQtd" ref={qtdRef} min="1" step="1" inputMode="numeric" value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </label>
          <label className="field">{entrada ? 'Custo unitário (R$)' : 'Preço de venda unitário (R$)'}
            <input type="number" id="movValor" min="0" step="0.01" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
          </label>
          <label className="field">Data
            <input type="date" id="movData" value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className="field span-2">{entrada ? 'Fornecedor / nota fiscal' : 'Cliente / placa do veículo'}
            <input type="text" id="movObs" maxLength="80" value={obs} onChange={(e) => setObs(e.target.value)}
              placeholder={entrada ? 'Ex.: NF 48200 · Distribuidora Rota Sul' : 'Ex.: Cliente balcão · placa RTA4F21'} />
          </label>
        </div>
        <div className="form-foot">
          {entrada
            ? <label className="check"><input type="checkbox" id="movLancar" checked={lancar} onChange={(e) => setLancar(e.target.checked)} /> Lançar a compra nas despesas</label>
            : <span />}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginLeft: 'auto' }}>
            <span className="form-msg" role="alert">{msg}</span>
            {total > 0 && <strong className="num">Total {brl(total)}</strong>}
            <button className="btn btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Registrando…' : entrada ? 'Registrar entrada' : 'Registrar saída'}
            </button>
          </div>
        </div>
      </form>

      <div className="card">
        <div className="toolbar">
          <input type="search" id="movBusca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pneu, cliente, placa ou fornecedor" aria-label="Buscar movimentações" />
          <select id="movFiltro" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar por tipo">
            <option value="">Entradas e saídas</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </select>
        </div>
        <div className="table-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr><th>Data</th><th>Tipo</th><th>Pneu</th><th className="r">Qtd</th><th className="r">Valor un.</th><th className="r">Total</th><th>Observação</th><th className="r" /></tr>
            </thead>
            <tbody>
              {lista.length ? lista.map((m) => {
                const [med, desc] = m.rotulo.split(' · ');
                return (
                  <tr key={m.id}>
                    <td>{dataBR(m.data)}</td>
                    <td><span className={'pill ' + (m.tipo === 'entrada' ? 'good' : 'bad')}>{m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                    <td><span className="size">{med}</span> <span className="muted">{desc}</span></td>
                    <td className="r"><b>{m.tipo === 'entrada' ? '+' : '−'}{m.qtd}</b></td>
                    <td className="r">{brl(m.valor)}</td>
                    <td className="r">{brl(m.qtd * m.valor)}</td>
                    <td className="muted">{m.obs}{m.por && nomes[m.por] ? <> · por {nomes[m.por]}</> : null}</td>
                    <td className="r"><button className="btn-link danger" onClick={() => onDesfazer(m)}>Desfazer</button></td>
                  </tr>
                );
              }) : <tr><td colSpan="8" className="empty">{movs.length ? 'Nada encontrado com esse filtro.' : 'Nenhuma movimentação registrada.'}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
