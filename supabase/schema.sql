-- Gerenciador de Pneus: estrutura do banco no Supabase.
-- Rode este arquivo inteiro uma vez em: Supabase > SQL Editor > New query > Run.

-- ---------- tabelas ----------
create table if not exists public.pneus (
  id uuid primary key default gen_random_uuid(),
  marca text not null,
  modelo text not null default '',
  largura int not null check (largura between 100 and 400),
  perfil int not null check (perfil between 20 and 95),
  aro int not null check (aro between 10 and 26),
  carga int not null,
  vel text not null,
  qtd int not null default 0 check (qtd >= 0),
  min int not null default 0 check (min >= 0),
  custo numeric(12, 2) not null default 0 check (custo >= 0),
  preco numeric(12, 2) not null default 0 check (preco >= 0),
  criado_em timestamptz not null default now()
);

create table if not exists public.movimentacoes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('entrada', 'saida')),
  pneu_id uuid references public.pneus (id) on delete set null,
  rotulo text not null,
  qtd int not null check (qtd > 0),
  valor numeric(12, 2) not null check (valor >= 0),
  data date not null default current_date,
  obs text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.despesas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  descricao text not null,
  categoria text not null,
  valor numeric(12, 2) not null check (valor > 0),
  pago boolean not null default true,
  mov_id uuid references public.movimentacoes (id) on delete cascade,
  criado_em timestamptz not null default now()
);

create index if not exists movimentacoes_data_idx on public.movimentacoes (data desc);
create index if not exists despesas_data_idx on public.despesas (data desc);

-- ---------- segurança ----------
-- Só usuários logados acessam os dados. Crie os usuários da loja em
-- Authentication > Users > Add user e desligue o cadastro público em
-- Authentication > Sign In / Providers > "Allow new users to sign up".
alter table public.pneus enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.despesas enable row level security;

drop policy if exists "equipe acessa pneus" on public.pneus;
create policy "equipe acessa pneus" on public.pneus
  for all to authenticated using (true) with check (true);

drop policy if exists "equipe acessa movimentacoes" on public.movimentacoes;
create policy "equipe acessa movimentacoes" on public.movimentacoes
  for all to authenticated using (true) with check (true);

drop policy if exists "equipe acessa despesas" on public.despesas;
create policy "equipe acessa despesas" on public.despesas
  for all to authenticated using (true) with check (true);

-- ---------- entradas e saídas ----------
-- Atualiza o estoque, grava a movimentação e (se pedido) a despesa da compra
-- numa única transação, para o estoque nunca ficar inconsistente.
create or replace function public.registrar_movimentacao(
  p_tipo text,
  p_pneu_id uuid,
  p_qtd int,
  p_valor numeric,
  p_data date,
  p_obs text,
  p_lancar_despesa boolean
) returns public.movimentacoes
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pneu public.pneus;
  v_mov public.movimentacoes;
  v_medida text;
begin
  if p_tipo not in ('entrada', 'saida') then
    raise exception 'Tipo de movimentação inválido.';
  end if;
  if coalesce(p_qtd, 0) <= 0 then
    raise exception 'Quantidade precisa ser 1 ou mais.';
  end if;

  select * into v_pneu from public.pneus where id = p_pneu_id for update;
  if not found then
    raise exception 'Pneu não encontrado.';
  end if;

  v_medida := v_pneu.largura || '/' || v_pneu.perfil || ' R' || v_pneu.aro;

  if p_tipo = 'saida' and v_pneu.qtd < p_qtd then
    raise exception 'Estoque insuficiente: há % un. de %.', v_pneu.qtd, v_medida;
  end if;

  update public.pneus
     set qtd = qtd + case when p_tipo = 'entrada' then p_qtd else -p_qtd end
   where id = p_pneu_id;

  insert into public.movimentacoes (tipo, pneu_id, rotulo, qtd, valor, data, obs)
  values (p_tipo, p_pneu_id,
          trim(v_medida || ' · ' || v_pneu.marca || ' ' || v_pneu.modelo),
          p_qtd, p_valor, coalesce(p_data, current_date), coalesce(p_obs, ''))
  returning * into v_mov;

  if p_tipo = 'entrada' and p_lancar_despesa and p_qtd * p_valor > 0 then
    insert into public.despesas (data, descricao, categoria, valor, pago, mov_id)
    values (v_mov.data, 'Compra ' || p_qtd || '× ' || v_medida || ' ' || v_pneu.marca,
            'Compra de pneus', p_qtd * p_valor, true, v_mov.id);
  end if;

  return v_mov;
end;
$$;

-- Desfaz uma movimentação: devolve o estoque e apaga a despesa ligada a ela.
create or replace function public.desfazer_movimentacao(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mov public.movimentacoes;
  v_pneu public.pneus;
begin
  select * into v_mov from public.movimentacoes where id = p_id for update;
  if not found then
    raise exception 'Movimentação não encontrada.';
  end if;

  if v_mov.pneu_id is not null then
    select * into v_pneu from public.pneus where id = v_mov.pneu_id for update;
    if found then
      if v_mov.tipo = 'entrada' and v_pneu.qtd < v_mov.qtd then
        raise exception 'Não dá para desfazer: só restam % un. dessa entrada no estoque.', v_pneu.qtd;
      end if;
      update public.pneus
         set qtd = qtd + case when v_mov.tipo = 'entrada' then -v_mov.qtd else v_mov.qtd end
       where id = v_pneu.id;
    end if;
  end if;

  delete from public.movimentacoes where id = p_id;  -- a despesa ligada cai junto (on delete cascade)
end;
$$;

revoke all on function public.registrar_movimentacao(text, uuid, int, numeric, date, text, boolean) from public, anon;
revoke all on function public.desfazer_movimentacao(uuid) from public, anon;
grant execute on function public.registrar_movimentacao(text, uuid, int, numeric, date, text, boolean) to authenticated;
grant execute on function public.desfazer_movimentacao(uuid) to authenticated;
