
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated, anon;
insert into auth.users values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

\ir ../supabase/migrations/20261021_lab_progress.sql

set role authenticated;
set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.save_lab_progress('crashloop',0,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '{"id":"crashloop","revision":1,"attempts":1,"completed":false}'::jsonb);
-- Replaying the same request must not increment its revision.
select public.save_lab_progress('crashloop',0,'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 '{"id":"crashloop","revision":1,"attempts":1,"completed":false}'::jsonb);
do $$ begin
 if (select count(*) from public.lab_progress) <> 1 then raise exception 'A cannot read own row'; end if;
 if (select revision from public.lab_progress) <> 1 then raise exception 'Replay changed revision'; end if;
 begin
  perform public.save_lab_progress('crashloop',0,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   '{"id":"crashloop","revision":1}'::jsonb);
  raise exception 'Stale write unexpectedly succeeded';
 exception when serialization_failure then null; end;
end $$;

set request.jwt.claim.sub='22222222-2222-4222-8222-222222222222';
do $$ declare affected integer; begin
 if (select count(*) from public.lab_progress) <> 0 then raise exception 'B can read A'; end if;
 update public.lab_progress set data='{}'::jsonb where user_id='11111111-1111-4111-8111-111111111111';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'B overwrote A'; end if;
 begin
  insert into public.lab_progress(user_id,exercise_id) values ('11111111-1111-4111-8111-111111111111','readiness');
  raise exception 'B inserted as A';
 exception when insufficient_privilege then null; end;
end $$;
select public.save_lab_progress('crashloop',0,'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 '{"id":"crashloop","revision":1,"attempts":5}'::jsonb);
do $$ begin
 if (select count(*) from public.lab_progress) <> 1 then raise exception 'B row count incorrect'; end if;
 if (select data->>'attempts' from public.lab_progress) <> '5' then raise exception 'B state incorrect'; end if;
end $$;

set request.jwt.claim.sub='11111111-1111-4111-8111-111111111111';
select public.save_lab_progress('crashloop',1,'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 '{"id":"crashloop","revision":2,"attempts":0,"completed":false}'::jsonb);
do $$ begin
 if (select data->>'attempts' from public.lab_progress) <> '0' then raise exception 'Reset not persisted'; end if;
end $$;

reset role;
set role anon;
set request.jwt.claim.sub='';
do $$ begin
 begin
  perform count(*) from public.lab_progress;
  raise exception 'Anonymous read unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
 begin
  perform public.save_lab_progress('crashloop',0,'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
   '{"id":"crashloop","revision":1}'::jsonb);
  raise exception 'Anonymous write unexpectedly succeeded';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: owner isolation, anonymous denial, idempotency, conflict and reset' as result;

-- Reapplying setup with existing rows must preserve every stored value.
create temporary table before_reapply as select * from public.lab_progress;
\ir ../supabase/migrations/20261021_lab_progress.sql
\ir ../supabase/migrations/20261021_lab_progress.sql
do $$ begin
  if exists ((select * from before_reapply except select * from public.lab_progress)
    union all (select * from public.lab_progress except select * from before_reapply))
  then raise exception 'Reapplying setup changed saved progress'; end if;
end $$;
select 'PASS: repeat setup preserves existing records' as repeat_result;
