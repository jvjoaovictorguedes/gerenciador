# Gerenciador de Pneus

App web para lojas de pneus:

- **Estoque por medida e marca.** A medida segue o padrão do mercado (por exemplo `205/55 R16 91V`), com estoque mínimo, custo, preço de venda e margem.
- **Entradas e saídas.** Uma compra do fornecedor soma ao estoque e pode virar despesa. Uma venda desconta do estoque e entra como receita. Qualquer movimentação pode ser desfeita.
- **Financeiro.** Vendas, despesas por categoria, saldo do mês e contas a pagar.

Feito em React. Os dados ficam no Supabase (Postgres) e o acesso é por login. Sem configuração, o app abre em modo demonstração, com dados de exemplo guardados no navegador.

**Para instalar e colocar no ar, veja [COMO-USAR.md](COMO-USAR.md).**

```bash
npm install
npm start      # http://localhost:3000
npm test
npm run build
```

Estrutura:

- `src/components/`: telas (Painel, Estoque, Entradas e saídas, Financeiro, Login)
- `src/lib/pneus.js`: regras e formatação (medida, índices de carga e velocidade, totais do mês)
- `src/lib/armazenamento.js`: dados no Supabase ou no navegador (modo demonstração)
- `supabase/schema.sql`: tabelas, segurança e funções de entrada e saída
- `preview/gerenciador-pneus.html`: protótipo original em uma página só
