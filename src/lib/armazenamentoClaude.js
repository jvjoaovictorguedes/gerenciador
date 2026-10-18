// Dados guardados no banco do próprio site quando ele é publicado no Claude.
// O login é a conta Claude de cada pessoa; quem pode ver ou alterar é definido
// no menu Compartilhar do site. As telas recebem os dados ao vivo (onSnapshot):
// o que um funcionário registra aparece na hora para os outros.
import { medida, rotulo, hoje } from './pneus';

const CAMPOS_PNEU = ['marca', 'modelo', 'largura', 'perfil', 'aro', 'carga', 'vel', 'min', 'custo', 'preco'];
const LIMITE = 1000; // movimentações e despesas mais recentes carregadas na tela

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function traduzir(e) {
  const codigo = e && e.code;
  if (codigo === 'invalid_argument') return new Error('Seu acesso não permite alterar os dados. Peça ao dono do site acesso de Colaborador.');
  if (codigo === 'quota_exceeded') return new Error('O banco do site está cheio. Apague dados antigos para continuar.');
  if (codigo === 'resource_exhausted') return new Error('Muitas operações seguidas. Espere alguns segundos e tente de novo.');
  if (codigo === 'revoked') return new Error('Seu acesso a este site foi alterado. Recarregue a página.');
  if (e instanceof Error) return e;
  return new Error('Não foi possível falar com o banco de dados. Tente de novo.');
}

const linhas = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export function criarArmazenamentoClaude(db, usuarioId) {
  const holder = (usuarioId || 'anon') + ':' + Math.random().toString(36).slice(2, 8);
  const pneus = db.collection('pneus');
  const movimentacoes = db.collection('movimentacoes');
  const despesas = db.collection('despesas');

  // Trava curta no pneu enquanto o estoque é recalculado, para duas pessoas
  // não registrarem ao mesmo tempo sobre o mesmo saldo.
  async function comTrava(ref, fn) {
    for (let i = 0; i < 10; i++) {
      const r = await ref.acquire({ holder, ttlMs: 3000 });
      if (r.acquired) return fn();
      await espera(300 + Math.random() * 400);
    }
    throw new Error('Outra pessoa está registrando este pneu agora. Tente de novo em instantes.');
  }

  const executar = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      throw traduzir(e);
    }
  };

  return {
    // Chama aoMudar({tires, movs, desp, exemplo}) a cada mudança no banco.
    assinar(aoMudar, aoFalhar) {
      const estado = { tires: null, movs: null, desp: null };
      const emitir = () => {
        if (!estado.tires || !estado.movs || !estado.desp) return;
        const dados = {
          tires: estado.tires.map((t) => ({ ...t, qtd: Number(t.qtd) || 0, min: Number(t.min) || 0, custo: Number(t.custo) || 0, preco: Number(t.preco) || 0 })),
          movs: estado.movs.map((m) => ({ ...m, qtd: Number(m.qtd), valor: Number(m.valor) })),
          desp: estado.desp.map((d) => ({ ...d, valor: Number(d.valor) })),
        };
        dados.exemplo = [...dados.tires, ...dados.movs, ...dados.desp].some((x) => x.exemplo);
        aoMudar(dados);
      };
      const erro = (e) => aoFalhar(traduzir(e).message);
      const parar = [
        pneus.onSnapshot((s) => { estado.tires = linhas(s); emitir(); }, erro),
        movimentacoes.orderBy('data', 'desc').limit(LIMITE).onSnapshot((s) => { estado.movs = linhas(s); emitir(); }, erro),
        despesas.orderBy('data', 'desc').limit(LIMITE).onSnapshot((s) => { estado.desp = linhas(s); emitir(); }, erro),
      ];
      return () => parar.forEach((p) => p());
    },

    salvarPneu: (pneu) => executar(async () => {
      const valores = Object.fromEntries(CAMPOS_PNEU.map((c) => [c, pneu[c]]));
      if (pneu.id) return pneus.doc(pneu.id).update(valores);
      return pneus.doc().set({ ...valores, qtd: Math.max(0, pneu.qtd || 0), criado_em: new Date().toISOString(), por: usuarioId });
    }),

    excluirPneu: (id) => executar(() => pneus.doc(id).delete()),

    registrarMovimentacao: ({ tipo, pneu_id, qtd, valor, data, obs, lancarDespesa }) => executar(async () => {
      if (!(qtd > 0)) throw new Error('Quantidade precisa ser 1 ou mais.');
      const ref = pneus.doc(pneu_id);
      return comTrava(ref, async () => {
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Pneu não encontrado.');
        const t = { id: snap.id, ...snap.data() };
        const atual = Number(t.qtd) || 0;
        if (tipo === 'saida' && atual < qtd) throw new Error(`Estoque insuficiente: há ${atual} un. de ${medida(t)}.`);
        const novo = atual + (tipo === 'entrada' ? qtd : -qtd);
        await ref.update({ qtd: novo });
        const movRef = movimentacoes.doc();
        const mov = { tipo, pneu_id, rotulo: rotulo(t), qtd, valor, data: data || hoje(), obs: obs || '', por: usuarioId, criado_em: new Date().toISOString() };
        try {
          await movRef.set(mov);
        } catch (e) {
          await ref.update({ qtd: atual }); // não deixa o estoque mudar sem a movimentação
          throw e;
        }
        if (tipo === 'entrada' && lancarDespesa && qtd * valor > 0) {
          await despesas.doc().set({ data: mov.data, descricao: `Compra ${qtd}× ${medida(t)} ${t.marca}`, categoria: 'Compra de pneus', valor: qtd * valor, pago: true, mov_id: movRef.id, por: usuarioId });
        }
        return { id: movRef.id, ...mov, estoqueAtual: novo };
      });
    }),

    desfazerMovimentacao: (id) => executar(async () => {
      const movRef = movimentacoes.doc(id);
      const snap = await movRef.get();
      if (!snap.exists) throw new Error('Movimentação não encontrada.');
      const m = snap.data();
      const ref = m.pneu_id ? pneus.doc(m.pneu_id) : null;
      const devolver = async () => {
        const p = ref && (await ref.get());
        if (p && p.exists) {
          const atual = Number(p.data().qtd) || 0;
          if (m.tipo === 'entrada' && atual < m.qtd) throw new Error(`Não dá para desfazer: só restam ${atual} un. dessa entrada no estoque.`);
          await ref.update({ qtd: atual + (m.tipo === 'entrada' ? -m.qtd : m.qtd) });
        }
        const ligadas = await despesas.where('mov_id', '==', id).get();
        for (const d of ligadas.docs) await despesas.doc(d.id).delete();
        await movRef.delete();
      };
      return ref ? comTrava(ref, devolver) : devolver();
    }),

    adicionarDespesa: (d) => executar(() => despesas.doc().set({ ...d, mov_id: null, por: usuarioId })),
    marcarPago: (id, pago) => executar(() => despesas.doc(id).update({ pago })),
    excluirDespesa: (id) => executar(() => despesas.doc(id).delete()),

    apagarExemplos: () => executar(async () => {
      for (const col of [despesas, movimentacoes, pneus]) {
        const snap = await col.where('exemplo', '==', true).limit(LIMITE).get();
        for (const d of snap.docs) await col.doc(d.id).delete();
      }
    }),
  };
}
