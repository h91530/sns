-- 비밀번호 재설정 토큰 저장 테이블
create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- 만료된 토큰 정리에 도움이 되는 인덱스
create index if not exists password_reset_tokens_user_expires_idx
  on public.password_reset_tokens (user_id, expires_at)
  where used_at is null;
