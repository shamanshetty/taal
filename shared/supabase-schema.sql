create extension if not exists vector;

-- Core users + profiles ------------------------------------------------------
create table if not exists public.users (
  id uuid primary key,
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  timezone text default 'Asia/Kolkata',
  currency text default 'INR',
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Income sources -------------------------------------------------------------
create table if not exists public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  source_name text not null,
  source_type text check (source_type in ('monthly','freelance','gig','other')) not null,
  amount numeric(14,2) not null,
  frequency text check (frequency in ('one-time','weekly','monthly','quarterly')) not null,
  created_at timestamptz default now()
);

-- Clients and invoices -------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  gst_number text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  type text check (type in ('income','expense','transfer')) not null,
  amount numeric(14,2) not null,
  currency text default 'INR' not null,
  category text,
  subcategory text,
  description text,
  date date not null,
  scheduled_for date,
  is_recurring boolean default false,
  recurrence_rule text,
  gst_eligible boolean default false,
  gst_rate numeric(5,2),
  ledger_status text check (ledger_status in ('unreconciled','pending','cleared')) default 'unreconciled',
  requires_follow_up boolean default false,
  follow_up_reason text,
  has_receipt boolean default false,
  tags text[],
  notes text,
  source text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  number text,
  description text,
  issue_date date,
  due_date date,
  amount numeric(14,2) not null,
  currency text default 'INR',
  status text check (status in ('draft','sent','paid','overdue','cancelled')) default 'draft',
  expected_payment_date date,
  actual_payment_date date,
  reminder_count int default 0,
  income_transaction_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint invoices_income_transaction_fk
    foreign key (income_transaction_id)
    references public.transactions(id)
    on delete set null
);

create table if not exists public.transaction_attachments (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  attachment_type text check (attachment_type in ('invoice','receipt','challan','other')),
  file_url text not null,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  note text,
  created_at timestamptz default now()
);

-- Compliance tasks -----------------------------------------------------------
create table if not exists public.compliance_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  task_type text check (task_type in ('gst','tax','bookkeeping')),
  title text,
  due_date date,
  status text check (status in ('pending','in_progress','completed')) default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Goals and planning --------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  status text check (status in ('active','paused','achieved')) default 'active',
  priority text check (priority in ('high','medium','low')) default 'medium',
  target_amount numeric(14,2) not null,
  current_amount numeric(14,2) default 0,
  deadline date,
  monthly_contribution numeric(14,2) default 0,
  required_monthly numeric(14,2) default 0,
  icon_key text,
  tags text[],
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric(14,2) not null,
  contribution_date date not null,
  source text,
  created_at timestamptz default now()
);

create table if not exists public.goal_focus_events (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  headline text,
  detail text,
  severity text check (severity in ('info','warning','critical')) default 'info',
  period_start date,
  period_end date,
  created_at timestamptz default now()
);

create table if not exists public.goal_milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade,
  title text,
  description text,
  due_date date,
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tax & compliance ----------------------------------------------------------
create table if not exists public.tax_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  financial_year text,
  preferred_regime text,
  base_savings numeric(14,2) default 0,
  avg_monthly_surplus numeric(14,2) default 0,
  avg_monthly_expense numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tax_deductions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  section text,
  label text,
  cap_amount numeric(14,2),
  actual_amount numeric(14,2) default 0,
  notes text,
  attachment_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tax_provisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  quarter text check (quarter in ('Q1','Q2','Q3','Q4')),
  due_date date,
  target_percent numeric(5,2),
  paid_percent numeric(5,2) default 0,
  paid_amount numeric(14,2) default 0,
  status text check (status in ('pending','partial','completed')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tds_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  payer_name text,
  form_type text,
  amount numeric(14,2),
  period text,
  status text,
  action_required text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.gst_filings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  filing_type text,
  period text,
  due_date date,
  status text,
  pending_items text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Reporting & analytics -----------------------------------------------------
create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  year int,
  month int,
  income numeric(14,2) default 0,
  expense numeric(14,2) default 0,
  savings numeric(14,2) default 0,
  budgeted_expense numeric(14,2) default 0,
  target_savings numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, year, month)
);

create table if not exists public.category_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  category text,
  period_year int,
  period_month int,
  planned_amount numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.income_quality_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  period_year int,
  period_month int,
  recurring_share numeric(5,2) default 0,
  one_off_share numeric(5,2) default 0,
  top_client_share numeric(5,2) default 0,
  breakdown jsonb,
  suggestion text,
  created_at timestamptz default now()
);

create table if not exists public.scenario_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  scenario_type text,
  title text,
  description text,
  amount numeric(14,2),
  decision text,
  buffer_after numeric(14,2),
  created_at timestamptz default now()
);

-- Historical metrics & communications --------------------------------------
create table if not exists public.pulse_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  score int check (score between 0 and 100),
  trend text check (trend in ('up','down','stable')),
  volatility numeric(5,3),
  savings_rate numeric(5,2),
  calculated_at timestamptz default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  audio_url text,
  created_at timestamptz default now()
);

create table if not exists public.tax_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  financial_year text not null,
  quarter text check (quarter in ('Q1','Q2','Q3','Q4')) not null,
  estimated_tax numeric(14,2) not null,
  paid_tax numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_nudges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  message text not null,
  sent_at timestamptz default now(),
  status text check (status in ('sent','delivered','read','failed')) default 'sent'
);

-- Agent memory ---------------------------------------------------------------
create table if not exists public.agent_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  topic text,
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now()
);

create index if not exists agent_memories_user_idx
  on public.agent_memories(user_id);

create index if not exists agent_memories_embedding_idx
  on public.agent_memories
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
