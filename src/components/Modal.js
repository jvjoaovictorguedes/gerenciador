import { useEffect, useRef } from 'react';

export function Modal({ titulo, onFechar, children }) {
  useEffect(() => {
    const tecla = (e) => e.key === 'Escape' && onFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onFechar]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal card" role="dialog" aria-modal="true" aria-label={titulo}>
        <header>
          <h3>{titulo}</h3>
          <button className="x" onClick={onFechar} aria-label="Fechar">×</button>
        </header>
        <div className="body">{children}</div>
      </div>
    </div>
  );
}

export function Confirmacao({ titulo, texto, rotulo, onConfirmar, onFechar }) {
  const ok = useRef(null);
  useEffect(() => ok.current?.focus(), []);
  return (
    <Modal titulo={titulo} onFechar={onFechar}>
      <p style={{ margin: '0 0 16px' }}>{texto}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button className="btn" onClick={onFechar}>Cancelar</button>
        <button className="btn btn-danger" ref={ok} onClick={() => { onFechar(); onConfirmar(); }}>{rotulo}</button>
      </div>
    </Modal>
  );
}
