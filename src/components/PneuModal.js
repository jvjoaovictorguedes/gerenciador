import { useState } from 'react';
import { Modal } from './Modal';
import { cargaKg, MARCAS, VELOCIDADE } from '../lib/pneus';

const VAZIO = { marca: '', modelo: '', largura: 195, perfil: 55, aro: 15, carga: 85, vel: 'H', qtd: 0, min: 4, custo: '', preco: '' };

export default function PneuModal({ pneu, tires, onSalvar, onFechar }) {
  const novo = !pneu;
  const [v, setV] = useState(() => ({ ...VAZIO, ...pneu }));
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);
  const campo = (nome) => ({ value: v[nome], onChange: (e) => setV({ ...v, [nome]: e.target.value }) });

  const kg = cargaKg(Number(v.carga));

  async function enviar(e) {
    e.preventDefault();
    const p = {
      id: pneu?.id,
      marca: String(v.marca).trim(),
      modelo: String(v.modelo).trim(),
      largura: parseInt(v.largura, 10),
      perfil: parseInt(v.perfil, 10),
      aro: parseInt(v.aro, 10),
      carga: parseInt(v.carga, 10),
      vel: v.vel,
      qtd: Math.max(0, parseInt(v.qtd, 10) || 0),
      min: Math.max(0, parseInt(v.min, 10) || 0),
      custo: parseFloat(v.custo),
      preco: parseFloat(v.preco),
    };
    if (!p.marca) return setMsg('Informe a marca.');
    if (!p.largura || !p.perfil || !p.aro) return setMsg('Preencha largura, perfil e aro da medida.');
    if (!p.carga) return setMsg('Informe o índice de carga (ex.: 91).');
    if (!(p.custo >= 0) || !(p.preco > 0)) return setMsg('Informe custo e preço de venda.');
    const repetido = tires.find((x) => x.id !== p.id && x.marca.toLowerCase() === p.marca.toLowerCase() && x.modelo.toLowerCase() === p.modelo.toLowerCase() && x.largura === p.largura && x.perfil === p.perfil && x.aro === p.aro);
    if (repetido) return setMsg('Esse pneu já está cadastrado. Use “+ Entrada” para somar ao estoque.');
    setSalvando(true);
    try {
      await onSalvar(p);
    } catch (err) {
      setMsg(err.message);
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={novo ? 'Novo pneu' : 'Editar pneu'} onFechar={onFechar}>
      <form onSubmit={enviar} noValidate>
        <div className="size-preview">
          {v.largura || '—'}/{v.perfil || '—'} R{v.aro || '—'} {v.carga}{v.vel}
          <small>
            Largura {v.largura} mm · perfil {v.perfil}% da largura · aro {v.aro}″{kg ? ` · suporta ${kg} kg por pneu` : ''} · até {VELOCIDADE[v.vel]} km/h
          </small>
        </div>
        <div className="form-grid">
          <label className="field">Marca<input id="pneuMarca" list="listaMarcas" placeholder="Ex.: Pirelli" autoFocus {...campo('marca')} /></label>
          <datalist id="listaMarcas">{MARCAS.map((m) => <option key={m} value={m} />)}</datalist>
          <label className="field">Modelo<input id="pneuModelo" placeholder="Ex.: Cinturato P7" {...campo('modelo')} /></label>
          <label className="field">Largura (mm)<input id="pneuLargura" type="number" min="125" max="355" step="5" {...campo('largura')} /></label>
          <label className="field">Perfil (%)<input id="pneuPerfil" type="number" min="25" max="85" step="5" {...campo('perfil')} /></label>
          <label className="field">Aro (pol.)<input id="pneuAro" type="number" min="12" max="24" step="1" {...campo('aro')} /></label>
          <label className="field">Índice de carga<input id="pneuCarga" type="number" min="60" max="130" {...campo('carga')} /></label>
          <label className="field span-2">Índice de velocidade
            <select id="pneuVel" {...campo('vel')}>
              {Object.entries(VELOCIDADE).map(([k, kmh]) => <option key={k} value={k}>{k} · até {kmh} km/h</option>)}
            </select>
          </label>
          {novo && <label className="field">Estoque inicial<input id="pneuQtd" type="number" min="0" step="1" {...campo('qtd')} /></label>}
          <label className="field">Estoque mínimo<input id="pneuMin" type="number" min="0" step="1" {...campo('min')} /></label>
          <label className="field">Custo (R$)<input id="pneuCusto" type="number" min="0" step="0.01" {...campo('custo')} /></label>
          <label className="field">Preço de venda (R$)<input id="pneuPreco" type="number" min="0" step="0.01" {...campo('preco')} /></label>
        </div>
        {!novo && <p className="hint" style={{ margin: '12px 0 0' }}>Para mudar a quantidade ({pneu.qtd} un.), registre uma entrada ou saída.</p>}
        <div className="form-foot">
          <span className="form-msg" role="alert">{msg}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
            <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando…' : novo ? 'Cadastrar pneu' : 'Salvar alterações'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
