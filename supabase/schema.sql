create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  value numeric(12,2) not null,
  category_id uuid references categories(id) on delete set null,
  strategic_classification text check (strategic_classification in ('Passivo', 'Manutenção', 'Alavancagem', 'Investimento')),
  date date not null,
  description text,
  recurring boolean default false,
  satisfaction_score smallint check (satisfaction_score between 0 and 10),
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists monthly_summary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reference_month date not null,
  income_total numeric(12,2) not null default 0,
  expense_total numeric(12,2) not null default 0,
  committed_pct numeric(5,2) not null default 0,
  investment_total numeric(12,2) not null default 0,
  available_balance numeric(12,2) not null default 0,
  passivo_pct numeric(5,2) not null default 0,
  manutencao_pct numeric(5,2) not null default 0,
  alavancagem_pct numeric(5,2) not null default 0,
  investimento_pct numeric(5,2) not null default 0,
  created_at timestamp with time zone default timezone('utc', now()),
  unique(user_id, reference_month)
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  monthly_savings numeric(12,2) not null default 0,
  monthly_investment numeric(12,2) not null default 0,
  category_cap jsonb not null default '{}',
  created_at timestamp with time zone default timezone('utc', now())
);

create table if not exists reflective_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  reference_month date not null,
  value_question text,
  avoidable_question text,
  increase_question text,
  created_at timestamp with time zone default timezone('utc', now())
);
