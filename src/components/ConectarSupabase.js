import { useState } from 'react';
import { Modal } from './Modal';
import { salvarConexaoSupabase, testarSupabase } from '../lib/armazenamento';

// Liga o site ao Supabase sem mexer nas variáveis da hospedagem.
// A conexão fica salva neste navegador; em outro aparelho, conecte de novo.
export default function ConectarSupabase({ onFechar }) {
  const [url, setUrl] = useState('');
  const [chave, setChave] = useState('');
  const [msg, setMsg] = useState('');
  const [testando, setTestando] = useState(false);

  async function conectar(e) {
    e.preventDefault();
    setTestando(true);
    setMsg('');
    try {
      salvarConexaoSupabase(await testarSupabase(url, chave));
      window.location.reload();
    } catch (err) {
      setMsg(err.message);
      setTestando(false);
    }
  }

  return (
    <Modal titulo="Conectar ao Supabase" onFechar={onFechar}>
      <form onSubmit={conectar} noValidate>
        <p className="hint" style={{ margin: '0 0 14px', fontSize: '.9rem' }}>
          No Supabase, abra <b>Project Settings › API</b> e copie os dois valores abaixo. Antes, rode o arquivo
          {' '}<code>supabase/schema.sql</code> no SQL Editor e crie os usuários em <b>Authentication › Users</b>.
        </p>
        <div className="form-grid">
          <label className="field span-2">Project URL
            <input id="supaUrl" type="url" placeholder="https://abcdefgh.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
          </label>
          <label className="field span-2">Chave anon public
            <input id="supaChave" type="text" placeholder="eyJhbGciOi… ou sb_publishable_…" value={chave} onChange={(e) => setChave(e.target.value)} spellCheck="false" autoComplete="off" />
          </label>
        </div>
        <p className="hint" style={{ margin: '12px 0 0' }}>
          A conexão fica salva neste navegador. Para valer em todos os aparelhos, cadastre os mesmos valores como variáveis na hospedagem.
        </p>
        <div className="form-foot">
          <span className="form-msg" role="alert">{msg}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
            <button className="btn btn-primary" type="submit" disabled={testando}>{testando ? 'Testando conexão…' : 'Conectar'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
