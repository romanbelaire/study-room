-- In-app discussion threads + proactive curriculum generation jobs

create table if not exists discussion_messages (
  id text primary key,
  topic_id text not null references topics(id) on delete cascade,
  learner_id text not null,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  tool_name text,
  tool_payload text,
  created_at timestamptz not null default now()
);

create index if not exists discussion_messages_topic_learner_idx
  on discussion_messages (topic_id, learner_id, created_at);

create table if not exists generation_jobs (
  id text primary key,
  topic_id text not null references topics(id) on delete cascade,
  learner_id text not null,
  kind text not null check (kind in ('mcq_bootstrap', 'mcq_topup')),
  status text not null check (status in ('pending', 'running', 'done', 'failed')),
  reason text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_jobs_pending_idx
  on generation_jobs (status, created_at);
