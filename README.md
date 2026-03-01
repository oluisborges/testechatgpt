# Finance Strategy App

Aplicativo web de controle financeiro doméstico com foco estratégico e comportamental.

## Stack
- React + Vite + Tailwind (frontend)
- Supabase (autenticação por email e banco relacional)

## Funcionalidades
- Dashboard executivo com KPIs, comparação mensal e gráficos (linha, pizza e barra).
- Cadastro de transações com classificação estratégica obrigatória para despesas.
- Metas financeiras com alertas visuais quando atingir 80%.
- Insights automáticos de comportamento financeiro.
- Relatório reflexivo mensal.
- Filtro por período, importação (placeholder) e exportação em CSV.
- Tema claro/escuro.
- Dados mockados para testes.

## Executar localmente
```bash
npm install
npm run dev
```

## Banco de dados (Supabase)
Execute o SQL de `supabase/schema.sql` no SQL Editor do Supabase.

Depois configure as variáveis do `.env.example`.
