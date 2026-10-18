import { useCallback, useEffect, useState } from 'react';
import './App.css';
import Topo, { ABAS } from './components/Topo';
import Painel from './components/Painel';
import Estoque from './components/Estoque';
import Movimentacoes from './components/Movimentacoes';
import Financeiro from './components/Financeiro';
import PneuModal from './components/PneuModal';
import Login from './components/Login';
import { Confirmacao } from './components/Modal';
import { armazenamento, armazenamentoLocal, modoDemo, supabase } from './lib/armazenamento';
import { brl, dataBR, hoje, medida, mesDe, nomeMes, rotulo } from './lib/pneus';

const abaDoEndereco = () => {
  const h = window.location.hash.slice(1);
  return ABAS.some(([id]) => id === h) ? h : 'painel';
};

function Gerenciador({ email }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aba, setAbaEstado] = useState(abaDoEndereco);
  const [mesFin, setMesFin] = useState(mesDe(hoje()));
  const [aviso, setAviso] = useState('');
  const [confirmar, setConfirmar] = useState(null);
  const [pneuModal, setPneuModal] = useState(null); // null fechado · {} novo · {pneu} edição
  const [predefinido, setPredefinido] = useState(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await armazenamento.carregar());
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  const setAba = (id) => {
    setAbaEstado(id);
    window.history.replaceState(null, '', '#' + id);
  };

  // Executa uma alteração, recarrega os dados e mostra o resultado.
  const executar = async (acao, mensagem) => {
    try {
      const r = await acao();
      await recarregar();
      setAviso(typeof mensagem === 'function' ? mensagem(r) : mensagem);
    } catch (e) {
      setAviso(e.message);
    }
  };

  const movimentar = (tipo, pneuId) => {
    setAba('movs');
    setPredefinido({ tipo, pneuId, vez: Date.now() });
  };

  if (!dados) {
    return (
      <div className="carregando">
        {erro ? <div className="aviso erro"><b>Não foi possível carregar os dados.</b> {erro} <button className="btn btn-sm" onClick={recarregar}>Tentar de novo</button></div> : 'Carregando…'}
      </div>
    );
  }

  const abaixoDoMinimo = dados.tires.filter((t) => t.qtd < t.min).length;

  return (
    <>
      <Topo
        aba={aba}
        onAba={setAba}
        abaixoDoMinimo={abaixoDoMinimo}
        modoDemo={modoDemo}
        exemplo={dados.exemplo}
        email={email}
        onSair={() => supabase.auth.signOut()}
        onRestaurar={() => setConfirmar({
          titulo: 'Restaurar exemplo', texto: 'Substituir tudo o que está aqui pelos dados de exemplo?', rotulo: 'Restaurar',
          acao: () => executar(() => armazenamentoLocal.restaurarExemplo(), 'Dados de exemplo restaurados'),
        })}
        onZerar={() => setConfirmar({
          titulo: 'Começar do zero', texto: 'Apagar todos os pneus, movimentações e despesas para testar com os seus próprios dados?', rotulo: 'Apagar tudo',
          acao: async () => { await executar(() => armazenamentoLocal.apagarTudo(), 'Tudo limpo. Cadastre o primeiro pneu.'); setAba('estoque'); },
        })}
      />

      <main className="wrap">
        {modoDemo && (
          <div className="aviso">
            <b>Modo demonstração.</b> Os dados ficam só neste navegador. Para guardar no banco de dados online, siga o passo a passo do arquivo <code>COMO-USAR.md</code>.
          </div>
        )}
        {erro && <div className="aviso erro"><b>Falha ao atualizar.</b> {erro}</div>}

        {aba === 'painel' && <Painel dados={dados} onMovimentar={movimentar} onAba={setAba} />}

        {aba === 'estoque' && (
          <Estoque
            tires={dados.tires}
            onNovo={() => setPneuModal({})}
            onEditar={(pneu) => setPneuModal({ pneu })}
            onMovimentar={movimentar}
            onExcluir={(t) => setConfirmar({
              titulo: 'Excluir pneu',
              texto: `Excluir ${rotulo(t)} do estoque? ${t.qtd ? `Ainda há ${t.qtd} unidade(s). ` : ''}O histórico de movimentações é mantido.`,
              rotulo: 'Excluir pneu',
              acao: () => executar(() => armazenamento.excluirPneu(t.id), 'Pneu excluído'),
            })}
          />
        )}

        {aba === 'movs' && (
          <Movimentacoes
            dados={dados}
            predefinido={predefinido}
            onRegistrar={async (m) => {
              const t = dados.tires.find((x) => x.id === m.pneu_id);
              await armazenamento.registrarMovimentacao(m);
              await recarregar();
              const agora = t.qtd + (m.tipo === 'entrada' ? m.qtd : -m.qtd);
              setAviso(`${m.tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada: ${m.tipo === 'entrada' ? '+' : '−'}${m.qtd} ${medida(t)} (agora ${agora} un.)`);
            }}
            onDesfazer={(m) => {
              const t = dados.tires.find((x) => x.id === m.pneu_id);
              const ligada = dados.desp.some((d) => d.mov_id === m.id);
              setConfirmar({
                titulo: 'Desfazer movimentação',
                texto: `Desfazer ${m.tipo === 'entrada' ? 'a entrada' : 'a saída'} de ${m.qtd} un. de ${m.rotulo} em ${dataBR(m.data)}?` +
                  (t ? ` O estoque volta para ${t.qtd + (m.tipo === 'entrada' ? -m.qtd : m.qtd)} un.` : '') +
                  (ligada ? ' A despesa de compra ligada a ela também será excluída.' : ''),
                rotulo: 'Desfazer',
                acao: () => executar(() => armazenamento.desfazerMovimentacao(m.id), 'Movimentação desfeita'),
              });
            }}
          />
        )}

        {aba === 'fin' && (
          <Financeiro
            dados={dados}
            mes={mesFin}
            onMes={setMesFin}
            onAdicionar={async (d) => {
              await armazenamento.adicionarDespesa(d);
              await recarregar();
              setMesFin(mesDe(d.data));
              setAviso(`Despesa lançada em ${nomeMes(mesDe(d.data))}`);
            }}
            onMarcarPago={(d) => executar(() => armazenamento.marcarPago(d.id, !d.pago), d.pago ? 'Marcada como pendente' : 'Marcada como paga')}
            onExcluir={(d) => setConfirmar({
              titulo: 'Excluir despesa', texto: `Excluir ${d.descricao} (${brl(d.valor)})?`, rotulo: 'Excluir',
              acao: () => executar(() => armazenamento.excluirDespesa(d.id), 'Despesa excluída'),
            })}
          />
        )}
      </main>

      {pneuModal && (
        <PneuModal
          pneu={pneuModal.pneu}
          tires={dados.tires}
          onFechar={() => setPneuModal(null)}
          onSalvar={async (p) => {
            await armazenamento.salvarPneu(p);
            await recarregar();
            setPneuModal(null);
            setAviso(p.id ? 'Alterações salvas' : `Cadastrado: ${medida(p)} ${p.marca}`);
          }}
        />
      )}

      {confirmar && (
        <Confirmacao
          titulo={confirmar.titulo}
          texto={confirmar.texto}
          rotulo={confirmar.rotulo}
          onConfirmar={confirmar.acao}
          onFechar={() => setConfirmar(null)}
        />
      )}

      {aviso && <div className="toast" role="status">{aviso}</div>}
    </>
  );
}

export default function App() {
  // undefined: verificando login · null: deslogado
  const [sessao, setSessao] = useState(modoDemo ? { demo: true } : undefined);

  useEffect(() => {
    if (modoDemo) return;
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (sessao === undefined) return <div className="carregando">Carregando…</div>;
  if (!sessao) return <Login />;
  return <Gerenciador email={sessao.user?.email} />;
}
