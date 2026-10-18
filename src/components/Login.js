import { useState } from 'react';
import { Logo } from './Topo';
import { supabase } from '../lib/armazenamento';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (!email.trim() || !senha) return setMsg('Informe e-mail e senha.');
    setEntrando(true);
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
  }

  return (
    <div className="login">
      <div className="card">
        <div className="login-top">
          <Logo />
          <h1>Gerenciador de Pneus</h1>
        </div>
        <form onSubmit={entrar} noValidate>
          <label className="field">E-mail
            <input type="email" id="loginEmail" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </label>
          <label className="field">Senha
            <input type="password" id="loginSenha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </label>
          <span className="form-msg" role="alert">{msg}</span>
          <button className="btn btn-primary" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
          <p className="hint" style={{ margin: 0 }}>Os acessos são criados pelo responsável da loja no painel do Supabase.</p>
        </form>
      </div>
    </div>
  );
}
