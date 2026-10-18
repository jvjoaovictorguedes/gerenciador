import { armazenamentoLocal } from './lib/armazenamento';
import { situacao, totaisDoMes, medida } from './lib/pneus';

beforeEach(async () => {
  localStorage.clear();
  await armazenamentoLocal.apagarTudo();
});

async function cadastrar(qtd = 4) {
  await armazenamentoLocal.salvarPneu({ marca: 'Pirelli', modelo: 'Cinturato P1', largura: 175, perfil: 70, aro: 14, carga: 84, vel: 'T', qtd, min: 2, custo: 289, preco: 389 });
  return (await armazenamentoLocal.carregar()).tires[0];
}

test('medida segue o padrão largura/perfil R aro', () => {
  expect(medida({ largura: 205, perfil: 55, aro: 16 })).toBe('205/55 R16');
});

test('situação do estoque', () => {
  expect(situacao({ qtd: 0, min: 4 })).toBe('bad');
  expect(situacao({ qtd: 3, min: 4 })).toBe('warn');
  expect(situacao({ qtd: 4, min: 4 })).toBe('good');
});

test('entrada soma ao estoque e lança a compra nas despesas', async () => {
  const t = await cadastrar(4);
  await armazenamentoLocal.registrarMovimentacao({ tipo: 'entrada', pneu_id: t.id, qtd: 10, valor: 289, data: '2026-10-10', obs: 'NF 1', lancarDespesa: true });
  const d = await armazenamentoLocal.carregar();
  expect(d.tires[0].qtd).toBe(14);
  expect(d.desp).toHaveLength(1);
  expect(d.desp[0].valor).toBe(2890);
});

test('saída maior que o estoque é bloqueada', async () => {
  const t = await cadastrar(3);
  await expect(armazenamentoLocal.registrarMovimentacao({ tipo: 'saida', pneu_id: t.id, qtd: 4, valor: 389, data: '2026-10-10' }))
    .rejects.toThrow('Estoque insuficiente: há 3 un. de 175/70 R14.');
  expect((await armazenamentoLocal.carregar()).tires[0].qtd).toBe(3);
});

test('desfazer devolve o estoque e apaga a despesa ligada', async () => {
  const t = await cadastrar(0);
  const mov = await armazenamentoLocal.registrarMovimentacao({ tipo: 'entrada', pneu_id: t.id, qtd: 8, valor: 289, data: '2026-10-10', lancarDespesa: true });
  await armazenamentoLocal.registrarMovimentacao({ tipo: 'saida', pneu_id: t.id, qtd: 2, valor: 389, data: '2026-10-11' });
  await expect(armazenamentoLocal.desfazerMovimentacao(mov.id)).rejects.toThrow('só restam 6 un.');
  const saida = (await armazenamentoLocal.carregar()).movs.find((m) => m.tipo === 'saida');
  await armazenamentoLocal.desfazerMovimentacao(saida.id);
  await armazenamentoLocal.desfazerMovimentacao(mov.id);
  const d = await armazenamentoLocal.carregar();
  expect(d.tires[0].qtd).toBe(0);
  expect(d.desp).toHaveLength(0);
  expect(d.movs).toHaveLength(0);
});

test('totais do mês: vendas das saídas menos despesas', async () => {
  const t = await cadastrar(10);
  await armazenamentoLocal.registrarMovimentacao({ tipo: 'saida', pneu_id: t.id, qtd: 4, valor: 389, data: '2026-10-11' });
  await armazenamentoLocal.adicionarDespesa({ descricao: 'Aluguel', categoria: 'Aluguel', valor: 1000, data: '2026-10-05', pago: false });
  const tot = totaisDoMes(await armazenamentoLocal.carregar(), '2026-10');
  expect(tot.vendas).toBe(1556);
  expect(tot.despesas).toBe(1000);
  expect(tot.saldo).toBe(556);
  expect(tot.aPagar).toBe(1000);
});

test('carregar devolve cópias: a tela não vê o estoque mudar antes de recarregar', async () => {
  const t = await cadastrar(30);
  await armazenamentoLocal.registrarMovimentacao({ tipo: 'saida', pneu_id: t.id, qtd: 4, valor: 389, data: '2026-10-11' });
  expect(t.qtd).toBe(30);
  expect((await armazenamentoLocal.carregar()).tires[0].qtd).toBe(26);
});
