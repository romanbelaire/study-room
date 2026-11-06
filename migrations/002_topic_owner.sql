alter table topics add column if not exists owner_id text;

create index if not exists topics_owner_idx on topics (owner_id);
