create table chat_conversations (
  user_id uuid references auth.users(id) on delete cascade,
  context_id text not null,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, context_id)
);

alter table chat_conversations enable row level security;

create policy "Users can manage their own chats"
  on chat_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
