create table if not exists generated_mcqs (
  id text primary key,
  topic_id text not null references topics (id) on delete cascade,
  owner_id text not null,
  difficulty text not null,
  question text not null,
  choices jsonb not null,
  answer_index integer not null,
  explanation text not null,
  source text not null default 'generated',
  created_at timestamptz not null default now()
);

create index if not exists generated_mcqs_topic_idx on generated_mcqs (topic_id, created_at desc);

create table if not exists generated_coding (
  id text primary key,
  topic_id text not null references topics (id) on delete cascade,
  owner_id text not null,
  title text not null,
  difficulty text not null,
  prompt text not null,
  starter text not null,
  hint text not null,
  solution text not null,
  check_fn text not null,
  source text not null default 'generated',
  created_at timestamptz not null default now()
);

create index if not exists generated_coding_topic_idx on generated_coding (topic_id, created_at desc);
