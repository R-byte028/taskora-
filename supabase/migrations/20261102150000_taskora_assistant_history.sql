-- Persistent, private Taskora Assistant conversation history.
create table public.assistant_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation'
    check (char_length(trim(title)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 3000),
  created_at timestamptz not null default now(),
  constraint assistant_messages_conversation_owner_fk
    foreign key (conversation_id, user_id)
    references public.assistant_conversations(id, user_id)
    on delete cascade
);

create index assistant_conversations_user_updated_idx
  on public.assistant_conversations(user_id, updated_at desc);
create index assistant_messages_conversation_created_idx
  on public.assistant_messages(conversation_id, created_at desc);

alter table public.assistant_conversations enable row level security;
alter table public.assistant_messages enable row level security;

grant select, insert, update on public.assistant_conversations to authenticated;
grant select, insert on public.assistant_messages to authenticated;

create policy "Users can view their own assistant conversations"
on public.assistant_conversations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own assistant conversations"
on public.assistant_conversations for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own assistant conversations"
on public.assistant_conversations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can view their own assistant messages"
on public.assistant_messages for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can add messages to their own assistant conversations"
on public.assistant_messages for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.assistant_conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);
