export const ABAS = [
  ['painel', 'Painel'],
  ['estoque', 'Estoque'],
  ['movs', 'Entradas e saídas'],
  ['fin', 'Financeiro'],
];

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="none" stroke="#F2B705" strokeWidth="5" strokeDasharray="4 2.2" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="#E9ECEF" strokeWidth="2.5" />
      <circle cx="20" cy="20" r="2.5" fill="#E9ECEF" />
    </svg>
  );
}

export default function Topo({ aba, onAba, abaixoDoMinimo, modoDemo, exemplo, email, onRestaurar, onZerar, onSair }) {
  return (
    <header className="topbar">
      <div className="wrap">
        <div className="brand-row">
          <Logo />
          <div className="brand">
            <h1>Gerenciador de Pneus</h1>
            <span>Estoque por medida e marca · entradas e saídas · despesas</span>
          </div>
          <div className="brand-actions">
            {modoDemo ? (
              <>
                {exemplo && <span className="sample-pill">Dados de exemplo</span>}
                <button className="btn-ghost-bar" onClick={onRestaurar}>Restaurar exemplo</button>
                <button className="btn-ghost-bar" onClick={onZerar}>Começar do zero</button>
              </>
            ) : (
              <>
                <span className="user-chip" title={email}>{email}</span>
                <button className="btn-ghost-bar" onClick={onSair}>Sair</button>
              </>
            )}
          </div>
        </div>
        <nav className="tabs" role="tablist" aria-label="Seções">
          {ABAS.map(([id, nome]) => (
            <button key={id} className="tab" role="tab" aria-selected={aba === id} onClick={() => onAba(id)}>
              {nome}
              {id === 'estoque' && abaixoDoMinimo > 0 && <span className="count">{abaixoDoMinimo}</span>}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
