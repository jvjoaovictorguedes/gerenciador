import { criarArmazenamentoClaude } from './armazenamentoClaude';

// Banco em memória com a mesma forma do banco do site no Claude.
function bancoFalso() {
  const docs = new Map(); // caminho -> dados
  const ouvintes = new Set();
  const avisar = () => ouvintes.forEach((f) => f());
  let n = 0;
  const query = (col, filtros = [], ordem = null, lim = 1000) => ({
    where: (c, op, v) => query(col, [...filtros, [c, v]], ordem, lim),
    orderBy: (c, d = 'asc') => query(col, filtros, [c, d], lim),
    limit: (l) => query(col, filtros, ordem, l),
    get: async () => snap(),
    onSnapshot(next) { const f = () => next(snap()); ouvintes.add(f); f(); return () => ouvintes.delete(f); },
    doc: (id) => ref(col + '/' + (id || 'd' + ++n)),
  });
  function snap() { return null; }
  const colecao = (col) => {
    const q = (filtros = [], ordem = null, lim = 1000) => {
      const obj = query(col, filtros, ordem, lim);
      const ler = () => {
        let ds = [...docs.entries()].filter(([p]) => p.startsWith(col + '/') && p.split('/').length === 2)
          .map(([p, d]) => ({ id: p.split('/')[1], exists: true, data: () => d }))
          .filter((d) => filtros.every(([c, v]) => d.data()[c] === v));
        if (ordem) ds.sort((a, b) => (a.data()[ordem[0]] < b.data()[ordem[0]] ? -1 : 1) * (ordem[1] === 'desc' ? -1 : 1));
        ds = ds.slice(0, lim);
        return { docs: ds, size: ds.length, empty: !ds.length };
      };
      return {
        ...obj,
        where: (c, op, v) => q([...filtros, [c, v]], ordem, lim),
        orderBy: (c, d = 'asc') => q(filtros, [c, d], lim),
        limit: (l) => q(filtros, ordem, l),
        get: async () => ler(),
        onSnapshot(next) { const f = () => next(ler()); ouvintes.add(f); f(); return () => ouvintes.delete(f); },
      };
    };
    return q();
  };
  const ref = (path) => ({
    id: path.split('/')[1],
    get: async () => ({ id: path.split('/')[1], exists: docs.has(path), data: () => docs.get(path) }),
    set: async (d) => { docs.set(path, { ...d }); avisar(); },
    update: async (d) => { if (!docs.has(path)) throw { code: 'invalid_argument' }; docs.set(path, { ...docs.get(path), ...d }); avisar(); },
    delete: async () => { docs.delete(path); avisar(); },
    acquire: async () => ({ acquired: true }),
  });
  return { collection: colecao, doc: ref, docs };
}

test('site no Claude: entrada, saída bloqueada, desfazer e dados ao vivo', async () => {
  const db = bancoFalso();
  const api = criarArmazenamentoClaude(db, 'u_1');
  let ultimo = null;
  const parar = api.assinar((d) => { ultimo = d; }, (e) => { throw new Error(e); });

  await api.salvarPneu({ marca: 'Michelin', modelo: 'Primacy 4', largura: 205, perfil: 55, aro: 16, carga: 91, vel: 'V', qtd: 2, min: 4, custo: 589, preco: 769 });
  const t = ultimo.tires[0];
  expect(t.qtd).toBe(2);

  const mov = await api.registrarMovimentacao({ tipo: 'entrada', pneu_id: t.id, qtd: 6, valor: 589, data: '2026-10-10', obs: 'NF 9', lancarDespesa: true });
  expect(ultimo.tires[0].qtd).toBe(8);
  expect(ultimo.desp).toHaveLength(1);
  expect(ultimo.movs[0].por).toBe('u_1');

  await expect(api.registrarMovimentacao({ tipo: 'saida', pneu_id: t.id, qtd: 9, valor: 769, data: '2026-10-11' }))
    .rejects.toThrow('Estoque insuficiente: há 8 un. de 205/55 R16.');

  await api.desfazerMovimentacao(mov.id);
  expect(ultimo.tires[0].qtd).toBe(2);
  expect(ultimo.desp).toHaveLength(0);
  expect(ultimo.movs).toHaveLength(0);

  await api.adicionarDespesa({ descricao: 'Aluguel', categoria: 'Aluguel', valor: 3200, data: '2026-10-05', pago: false });
  await api.marcarPago(ultimo.desp[0].id, true);
  expect(ultimo.desp[0].pago).toBe(true);
  parar();
});

test('site no Claude: sem permissão vira mensagem clara', async () => {
  const db = bancoFalso();
  const api = criarArmazenamentoClaude(db, 'u_2');
  await expect(api.marcarPago('nao-existe', true)).rejects.toThrow('Seu acesso não permite alterar os dados');
});

test('site no Claude: apagar exemplos mantém o que é real', async () => {
  const db = bancoFalso();
  db.docs.set('pneus/ex1', { marca: 'X', exemplo: true, qtd: 1 });
  db.docs.set('pneus/real', { marca: 'Y', qtd: 1 });
  db.docs.set('despesas/ex2', { descricao: 'a', valor: 1, data: '2026-10-01', exemplo: true });
  const api = criarArmazenamentoClaude(db, 'u_1');
  await api.apagarExemplos();
  expect([...db.docs.keys()]).toEqual(['pneus/real']);
});
