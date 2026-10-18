# Gerenciador de Pneus: como colocar no ar

O app controla o estoque de pneus por medida e marca, as entradas e saídas e as despesas da loja.

Ele funciona de dois jeitos:

- **Modo demonstração.** É o que acontece quando o app roda sem configuração. Ele já vem com dados de exemplo, e tudo fica guardado só no navegador.
- **Modo loja.** Os dados ficam no banco de dados online (Supabase), com login. Os mesmos dados aparecem no computador da loja, no celular e para cada funcionário.

Para usar de verdade, siga os 4 passos abaixo. Leva uns 20 minutos, e tudo cabe nos planos gratuitos.

---

## 1. Criar o banco de dados no Supabase

1. Crie uma conta em <https://supabase.com> (pode entrar com a conta do GitHub).
2. Clique em **New project**. Escolha um nome, como `gerenciador-pneus`, crie uma senha forte para o banco e selecione a região **South America (São Paulo)**.
3. Quando o projeto terminar de criar, abra **SQL Editor** › **New query**.
4. Copie todo o conteúdo do arquivo [`supabase/schema.sql`](supabase/schema.sql), cole no editor e clique em **Run**. Isso cria as tabelas, as regras de segurança e as funções de entrada e saída.

## 2. Criar os acessos da loja

1. Abra **Authentication** › **Users** › **Add user** › **Create new user**.
2. Informe o e-mail e a senha de quem vai usar o app. Marque **Auto Confirm User**.
3. Repita para cada funcionário.
4. Abra **Authentication** › **Sign In / Providers** e **desligue** a opção *Allow new users to sign up*. Assim, só entra quem você cadastrou.

## 3. Ligar o app ao banco

No Supabase, abra **Project Settings** › **API** e copie dois valores: a **Project URL** e a chave **anon public**.

- **Para rodar no seu computador:** copie o arquivo `.env.example` para `.env` e cole esses dois valores nele.
- **Para hospedar na internet:** cadastre os mesmos valores como variáveis de ambiente no serviço de hospedagem (veja o passo 4).

```
REACT_APP_SUPABASE_URL=https://SEU-PROJETO.supabase.co
REACT_APP_SUPABASE_ANON_KEY=cole-aqui-a-chave-anon-public
```

A chave *anon public* pode ficar no app sem problema. Os dados só aparecem para quem faz login, e quem garante isso são as regras de segurança criadas no passo 1. **Nunca** use a chave `service_role` no app.

## 4. Rodar ou hospedar

**No seu computador.** Você precisa ter o Node.js 18 ou mais novo instalado.

```bash
npm install
npm start          # abre em http://localhost:3000
```

**Na internet, de graça, com Cloudflare Pages.** O plano gratuito permite uso comercial.

1. Crie uma conta em <https://dash.cloudflare.com> e abra **Workers & Pages** › **Create** › **Pages** › **Connect to Git**.
2. Escolha o repositório `gerenciador`.
3. Em *Build command*, coloque `npm run build`. Em *Build output directory*, coloque `build`.
4. Em **Environment variables**, adicione `REACT_APP_SUPABASE_URL` e `REACT_APP_SUPABASE_ANON_KEY` com os valores do passo 3.
5. Clique em **Save and Deploy**. O app ganha um endereço do tipo `gerenciador.pages.dev`. Depois você pode ligar um domínio próprio.

> O plano gratuito da Vercel (Hobby) não permite uso comercial. Por isso a recomendação aqui é a Cloudflare Pages.

---

## Custos

| Serviço | Plano gratuito | Quando pagar |
| --- | --- | --- |
| Supabase (banco + login) | 500 MB de banco, que dá para centenas de milhares de movimentações | Pro: US$ 25/mês. Vale a pena quando você quiser backup diário automático ou passar de 500 MB |
| Cloudflare Pages (hospedagem) | Acessos ilimitados, uso comercial permitido | Não é necessário para este app |

No plano gratuito, o Supabase **pausa o projeto depois de 7 dias sem nenhum acesso**. Se a loja usa todo dia, isso não acontece. Se acontecer, basta clicar em *Restore* no painel do Supabase.

Para não depender de nada, exporte de vez em quando as tabelas em **Table Editor** › *Export to CSV*.

## Comandos de desenvolvimento

```bash
npm test           # testes das regras de estoque e financeiro
npm run build      # gera a versão final na pasta build/
```
