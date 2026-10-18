import { useCallback, useEffect, useState } from 'react';
import './App.css';
import Topo, { ABAS, Logo } from './components/Topo';
import Painel from './components/Painel';
import Estoque from './components/Estoque';
import Movimentacoes from './components/Movimentacoes';
import Financeiro from './components/Financeiro';
import PneuModal from './components/PneuModal';
import Login from './components/Login';
import { Confirmacao } from './components/Modal';
import ConectarSupabase from './components/ConectarSupabase';
import { armazenamentoLocal, dadosProprios, iniciarArmazenamento, supabase } from './lib/armazenamento';
import { brl, dataBR, hoje, medida, mesDe, nomeMes, rotulo } from './lib/pneus';

const abaDoEndereco = () => {
  const h = window.location.hash.slice(1);
  return ABAS.some(([id]) => id === h) ? h : 'painel';
};

function Gerenciador({ ambiente, email }) {
  const { modo, api, usuario } = ambiente;
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [aba, setAbaEstado] = useState(abaDoEndereco);
  const [mesFin, setMesFin] = useState(mesDe(hoje()));
  const [aviso, setAviso] = useState('');
  const [confirmar, setConfirmar] = useState(null);
  const [pneuModal, setPneuModal] = useState(null); // null fechado · {} novo · {pneu} edição
  const [predefinido, setPredefinido] = useState(null);
  const [nomes, setNomes] = useState({});
  const [conectar, setConectar] = useState(false);
  const [locais, setLocais] = useState(() => (modo === 'supabase' ? dadosProprios() : null));
  // O botão de conectar só faz sentido fora do Claude (lá o site já tem banco próprio).
  const podeConectar = modo === 'demo' && !window.claude;

  // Com dados ao vivo (site no Claude) as telas se atualizam sozinhas;
  // nos outros modos, recarrega depois de cada alteração.
  const aoVivo = typeof api.assinar === 'function';
  const recarregar = useCallback(async () => {
    if (aoVivo) return;
    try {
      setDados(await api.carregar());
      setErro('');
    } catch (e) {
      setErro(e.message);
    }
  }, [api, aoVivo]);

  useEffect(() => {
    if (aoVivo) return api.assinar((d) => { setDados(d); setErro(''); }, setErro);
    recarregar();
  }, [api, aoVivo, recarregar]);

  // Nome de quem registrou cada movimentação (login pela conta Claude).
  useEffect(() => {
    if (!usuario || !dados) return;
    const ids = [...new Set(dados.movs.map((m) => m.por).filter(Boolean))];
    if (!ids.length) return;
    let ativo = true;
    usuario.nomes(ids).then((ps) => {
      if (ativo) setNomes(Object.fromEntries(Object.entries(ps).map(([id, p]) => [id, p.name])));
    });
    return () => { ativo = false; };
  }, [usuario, dados]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(t);
  }, [aviso]);

  const setAba = (id) => {
    setAbaEstado(id);
    try { window.history.replaceState(null, '', '#' + id); } catch (e) { /* endereço fixo neste ambiente */ }
  };

  // Executa uma alteração, atualiza os dados e mostra o resultado.
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
        {erro ? <div className="aviso erro"><b>Não foi possível carregar os dados.</b> {erro} {!aoVivo && <button className="btn btn-sm" onClick={recarregar}>Tentar de novo</button>}</div> : 'Carregando…'}
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
        modo={modo}
        exemplo={dados.exemplo}
        email={email}
        usuario={usuario}
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
        {modo === 'demo' && (
          <div className="aviso">
            <b>Modo demonstração.</b> Você pode cadastrar tudo, mas os dados ficam só neste navegador: não aparecem em outro aparelho e somem se o histórico do navegador for limpo.
            {podeConectar && <button className="btn btn-sm btn-primary" onClick={() => setConectar(true)}>Conectar ao Supabase</button>}
          </div>
        )}
        {modo === 'claude' && usuario && !usuario.podeEscrever && (
          <div className="aviso"><b>Acesso só para ver.</b> Para registrar entradas, saídas e despesas, peça ao dono do site acesso de Colaborador.</div>
        )}
        {modo === 'claude' && dados.exemplo && usuario && usuario.podeEscrever && (
          <div className="aviso">
            <b>Há dados de exemplo no site.</b> Eles servem para você testar. Quando for usar de verdade, apague-os.
            <button className="btn btn-sm" onClick={() => setConfirmar({
              titulo: 'Apagar dados de exemplo',
              texto: 'Apagar os pneus, movimentações e despesas de exemplo? O que você cadastrou continua.',
              rotulo: 'Apagar exemplos',
              acao: () => executar(() => api.apagarExemplos(), 'Dados de exemplo apagados'),
            })}>Apagar dados de exemplo</button>
          </div>
        )}
        {locais && (
          <div className="aviso">
            <b>Este navegador tem {locais.tires.length} pneu(s), {locais.movs.length} movimentação(ões) e {locais.desp.length} despesa(s) cadastrados no modo demonstração.</b> Quer enviar tudo para o banco?
            <button className="btn btn-sm btn-primary" onClick={() => setConfirmar({
              titulo: 'Enviar para o banco',
              texto: 'Enviar para o Supabase os pneus, as movimentações e as despesas cadastrados neste navegador? Depois do envio, a cópia do navegador é apagada.',
              rotulo: 'Enviar',
              acao: () => executar(async () => {
                const r = await api.importar(locais);
                await armazenamentoLocal.apagarTudo();
                setLocais(null);
                return r;
              }, (r) => `Enviado: ${r.pneus} pneu(s), ${r.movimentacoes} movimentação(ões) e ${r.despesas} despesa(s)`),
            })}>Enviar para o banco</button>
            <button className="btn btn-sm" onClick={() => setLocais(null)}>Agora não</button>
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
              acao: () => executar(() => api.excluirPneu(t.id), 'Pneu excluído'),
            })}
          />
        )}

        {aba === 'movs' && (
          <Movimentacoes
            dados={dados}
            nomes={nomes}
            predefinido={predefinido}
            onRegistrar={async (m) => {
              const t = dados.tires.find((x) => x.id === m.pneu_id);
              await api.registrarMovimentacao(m);
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
                acao: () => executar(() => api.desfazerMovimentacao(m.id), 'Movimentação desfeita'),
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
              await api.adicionarDespesa(d);
              await recarregar();
              setMesFin(mesDe(d.data));
              setAviso(`Despesa lançada em ${nomeMes(mesDe(d.data))}`);
            }}
            onMarcarPago={(d) => executar(() => api.marcarPago(d.id, !d.pago), d.pago ? 'Marcada como pendente' : 'Marcada como paga')}
            onExcluir={(d) => setConfirmar({
              titulo: 'Excluir despesa', texto: `Excluir ${d.descricao} (${brl(d.valor)})?`, rotulo: 'Excluir',
              acao: () => executar(() => api.excluirDespesa(d.id), 'Despesa excluída'),
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
            await api.salvarPneu(p);
            await recarregar();
            setPneuModal(null);
            setAviso(p.id ? 'Alterações salvas' : `Cadastrado: ${medida(p)} ${p.marca}`);
          }}
        />
      )}

      {conectar && <ConectarSupabase onFechar={() => setConectar(false)} />}

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

// Site publicado no Claude, mas esta pessoa não entrou com a conta ou não recebeu acesso.
function SemAcesso({ onDemo }) {
  return (
    <div className="login sem-acesso">
      <div className="card">
        <div className="login-top"><Logo /><h1>Gerenciador de Pneus</h1></div>
        <div className="body">
          <p><b>Entre com a sua conta Claude para usar o sistema.</b></p>
          <p className="muted">Se você já entrou, peça ao dono da loja para liberar o seu acesso pelo botão Compartilhar do site.</p>
          <button className="btn" onClick={onDemo}>Ver uma demonstração com dados de exemplo</button>
        </div>
      </div>
    </div>
  );
}

function ComLoginSupabase({ ambiente }) {
  // undefined: verificando login · null: deslogado
  const [sessao, setSessao] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s));
    return () => data.subscription.unsubscribe();
  }, []);
  if (sessao === undefined) return <div className="carregando">Carregando…</div>;
  if (!sessao) return <Login />;
  return <Gerenciador ambiente={ambiente} email={sessao.user?.email} />;
}

export default function App() {
  const [ambiente, setAmbiente] = useState(null);
  useEffect(() => { iniciarArmazenamento().then(setAmbiente); }, []);

  if (!ambiente) return <div className="carregando">Carregando…</div>;
  if (ambiente.modo === 'sem-acesso') return <SemAcesso onDemo={() => setAmbiente({ modo: 'demo', api: armazenamentoLocal })} />;
  if (ambiente.modo === 'supabase') return <ComLoginSupabase ambiente={ambiente} />;
  return <Gerenciador ambiente={ambiente} />;
}
