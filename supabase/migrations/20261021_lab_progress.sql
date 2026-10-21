
begin;

create table public.lab_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null check (exercise_id in
    ('crashloop','readiness','rbac','pvc','jenkins','gitops','alerts','latency','bash','incident')),
  revision integer not null default 0 check (revision >= 0),
  request_id uuid,
  data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 262144),
  updated_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

alter table public.lab_progress enable row level security;
alter table public.lab_progress force row level security;

create policy own_progress_select on public.lab_progress for select to authenticated
  using ((select auth.uid()) = user_id);
create policy own_progress_insert on public.lab_progress for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy own_progress_update on public.lab_progress for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.lab_progress from public, anon;
grant select, insert, update on public.lab_progress to authenticated;

create function public.save_lab_progress(
  p_exercise_id text, p_revision integer, p_request_id uuid, p_data jsonb
) returns jsonb language plpgsql security invoker
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  saved public.lab_progress;
begin
  if owner_id is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  if p_revision is null or p_revision < 0 or p_revision >= 2147483647
    or p_request_id is null or p_data is null
    or jsonb_typeof(p_data) <> 'object'
    or octet_length(p_data::text) > 262144
    or (p_data->>'id') is distinct from p_exercise_id
    or (p_data->>'revision') is distinct from (p_revision + 1)::text
  then raise exception 'Invalid progress payload' using errcode = '22023'; end if;

  insert into public.lab_progress(user_id, exercise_id)
    values (owner_id, p_exercise_id) on conflict do nothing;
  select * into strict saved from public.lab_progress
    where user_id = owner_id and exercise_id = p_exercise_id for update;
  if saved.request_id = p_request_id then return saved.data; end if;
  if saved.revision <> p_revision then
    raise exception 'Progress changed in another tab. Reload and retry.' using errcode = '40001';
  end if;
  update public.lab_progress set
    revision = p_revision + 1, request_id = p_request_id,
    data = p_data, updated_at = now()
    where user_id = owner_id and exercise_id = p_exercise_id;
  return p_data;
end;
$$;

revoke all on function public.save_lab_progress(text, integer, uuid, jsonb) from public, anon;
grant execute on function public.save_lab_progress(text, integer, uuid, jsonb) to authenticated;
commit;
