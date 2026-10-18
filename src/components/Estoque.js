import { useMemo, useState } from 'react';
import { brl, cargaKg, situacao, SITUACAO_TEXTO, VELOCIDADE } from '../lib/pneus';

export default function Estoque({ tires, onNovo, onEditar, onExcluir, onMovimentar }) {
  const [aro, setAro] = useState('');
  const [busca, setBusca] = useState('');
  const [marca, setMarca] = useState('');
  const [soBaixos, setSoBaixos] = useState(false);

  const aros = useMemo(() => [...new Set(tires.map((t) => t.aro))].sort((a, b) => a - b), [tires]);
  const marcas = useMemo(() => [...new Set(tires.map((t) => t.marca))].sort(), [tires]);
  const aroAtivo = aros.includes(Number(aro)) ? aro : '';

  const q = busca.trim().toLowerCase();
  const lista = tires
    .filter((t) =>
      (!aroAtivo || String(t.aro) === String(aroAtivo)) &&
      (!marca || t.marca === marca) &&
      (!soBaixos || t.qtd < t.min) &&
      (!q || `${t.largura}/${t.perfil} r${t.aro} ${t.largura}/${t.perfil}r${t.aro} ${t.marca} ${t.modelo}`.toLowerCase().includes(q)))
    .sort((a, b) => a.aro - b.aro || a.largura - b.largura || a.perfil - b.perfil);

  return (
    <section className="view">
      <div className="view-head">
        <div>
          <h2>Estoque de pneus</h2>
          <p>Medida no padrão largura/perfil R aro, com índice de carga e velocidade.</p>
        </div>
        <button className="btn btn-primary" onClick={onNovo}>+ Novo pneu</button>
      </div>
      <div className="card">
        <div className="chips" aria-label="Filtrar por aro">
          <button className="chip-btn" aria-pressed={aroAtivo === ''} onClick={() => setAro('')}>Todos os aros</button>
          {aros.map((a) => (
            <button key={a} className="chip-btn" aria-pressed={String(aroAtivo) === String(a)} onClick={() => setAro(String(a))}>
              R{a}<em>{tires.filter((t) => t.aro === a).reduce((s, t) => s + t.qtd, 0)}</em>
            </button>
          ))}
        </div>
        <div className="toolbar">
          <input type="search" id="estoqueBusca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar medida, marca ou modelo (ex.: 205/55, Pirelli)" aria-label="Buscar no estoque" />
          <select id="estoqueMarca" value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Filtrar por marca">
            <option value="">Todas as marcas</option>
            {marcas.map((m) => <option key={m}>{m}</option>)}
          </select>
          <label className="check"><input type="checkbox" id="estoqueBaixos" checked={soBaixos} onChange={(e) => setSoBaixos(e.target.checked)} /> Só abaixo do mínimo</label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Medida</th><th>Marca / modelo</th><th>Índice</th><th>Quantidade</th><th>Situação</th>
                <th className="r">Custo</th><th className="r">Venda</th><th className="r">Margem</th><th className="r">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.length ? lista.map((t) => {
                const st = situacao(t);
                const pct = Math.min(100, (t.qtd / Math.max(t.min * 2.5, t.qtd, 1)) * 100);
                const margem = t.preco > 0 ? ((t.preco - t.custo) / t.preco) * 100 : 0;
                const kg = cargaKg(Number(t.carga));
                const dica = `Carga ${t.carga}${kg ? ` (${kg} kg por pneu)` : ''} · Velocidade ${t.vel}${VELOCIDADE[t.vel] ? ` (até ${VELOCIDADE[t.vel]} km/h)` : ''}`;
                return (
                  <tr key={t.id}>
                    <td><span className="size">{t.largura}/{t.perfil} <span className="r-aro">R{t.aro}</span></span></td>
                    <td className="brand-cell"><b>{t.marca}</b><span>{t.modelo}</span></td>
                    <td><span className="idx" title={dica}>{t.carga}{t.vel}</span></td>
                    <td><div className="stock"><b>{t.qtd}</b><div className={'meter ' + st} title={`Mínimo: ${t.min}`}><i style={{ width: pct + '%' }} /></div></div></td>
                    <td style={{ whiteSpace: 'nowrap' }}><span className={'pill ' + st}>{SITUACAO_TEXTO[st]}</span> <span className="muted" style={{ fontSize: '.8rem' }}>mín. {t.min}</span></td>
                    <td className="r">{brl(t.custo)}</td>
                    <td className="r">{brl(t.preco)}</td>
                    <td className={'r ' + (margem < 15 ? 'neg' : '')}>{margem.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-in" onClick={() => onMovimentar('entrada', t.id)}>+ Entrada</button>
                        <button className="btn btn-sm btn-out" onClick={() => onMovimentar('saida', t.id)} disabled={t.qtd <= 0}>− Saída</button>
                        <button className="btn-link" onClick={() => onEditar(t)}>Editar</button>
                        <button className="btn-link danger" onClick={() => onExcluir(t)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="9" className="empty">{tires.length ? 'Nenhum pneu com esses filtros.' : 'Nenhum pneu cadastrado. Clique em “+ Novo pneu” para começar.'}</td></tr>
              )}
            </tbody>
            {lista.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan="3">{lista.length} item(ns) listado(s)</td>
                  <td>{lista.reduce((a, t) => a + t.qtd, 0).toLocaleString('pt-BR')} un.</td>
                  <td />
                  <td className="r">{brl(lista.reduce((a, t) => a + t.qtd * t.custo, 0))}</td>
                  <td className="r">{brl(lista.reduce((a, t) => a + t.qtd * t.preco, 0))}</td>
                  <td colSpan="2" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </section>
  );
}
