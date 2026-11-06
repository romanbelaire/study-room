create table if not exists topics (
  id text primary key,
  title text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists journey_items (
  id text primary key,
  learner_id text not null,
  topic_id text not null references topics (id) on delete cascade,
  kind text not null,
  item_key text not null,
  label text not null,
  bucket text not null,
  times_correct integer not null default 0,
  times_wrong integer not null default 0,
  last_outcome text,
  last_seen_at timestamptz not null default now(),
  next_review_at timestamptz,
  confirmed_at timestamptz,
  notes text not null default '',
  unique (learner_id, topic_id, kind, item_key)
);

create index if not exists journey_items_learner_bucket_idx
  on journey_items (learner_id, bucket);

create index if not exists journey_items_topic_idx
  on journey_items (topic_id);

create table if not exists outcome_events (
  id text primary key,
  learner_id text not null,
  topic_id text not null,
  kind text not null,
  item_key text not null,
  outcome text not null,
  created_at timestamptz not null default now()
);

create index if not exists outcome_events_learner_idx
  on outcome_events (learner_id, created_at desc);

create table if not exists topic_sessions (
  topic_id text primary key references topics (id) on delete cascade,
  chat_title text not null,
  prefill text not null,
  connected_at timestamptz not null default now()
);
