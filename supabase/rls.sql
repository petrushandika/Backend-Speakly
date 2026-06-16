-- Run this once in Supabase SQL Editor after `npm run db:push`

-- Enable RLS on all tables
alter table users              enable row level security;
alter table lessons            enable row level security;
alter table user_progress      enable row level security;
alter table flashcards         enable row level security;
alter table vocabulary         enable row level security;
alter table user_errors        enable row level security;
alter table chat_messages      enable row level security;
alter table speaking_sessions  enable row level security;
alter table rooms              enable row level security;
alter table room_members       enable row level security;

-- users: own row only
create policy "users_select" on users for select using (auth_id = auth.uid());
create policy "users_insert" on users for insert with check (auth_id = auth.uid());
create policy "users_update" on users for update using (auth_id = auth.uid());

-- lessons: public read
create policy "lessons_read" on lessons for select using (true);

-- own-data tables: user_id must match
create policy "own_progress"  on user_progress     using (user_id = (select id from users where auth_id = auth.uid()));
create policy "own_flashcards" on flashcards        using (user_id = (select id from users where auth_id = auth.uid()));
create policy "own_vocabulary" on vocabulary        using (user_id = (select id from users where auth_id = auth.uid()));
create policy "own_errors"    on user_errors        using (user_id = (select id from users where auth_id = auth.uid()));
create policy "own_chat"      on chat_messages      using (user_id = (select id from users where auth_id = auth.uid()));
create policy "own_speaking"  on speaking_sessions  using (user_id = (select id from users where auth_id = auth.uid()));

-- rooms: anyone reads active rooms, only host modifies
create policy "rooms_read"   on rooms for select using (is_active = true);
create policy "rooms_insert" on rooms for insert with check (host_id = (select id from users where auth_id = auth.uid()));
create policy "rooms_update" on rooms for update using (host_id = (select id from users where auth_id = auth.uid()));

-- room_members: anyone reads, members manage themselves
create policy "room_members_read"   on room_members for select using (true);
create policy "room_members_insert" on room_members for insert with check (user_id = (select id from users where auth_id = auth.uid()));
create policy "room_members_delete" on room_members for delete using (user_id = (select id from users where auth_id = auth.uid()));
