-- 1:1 문의 테이블 생성
create table if not exists public.user_inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  status text not null default 'pending',
  response text,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists user_inquiries_user_created_idx
  on public.user_inquiries (user_id, created_at desc);
