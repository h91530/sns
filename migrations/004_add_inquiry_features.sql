-- 1:1 문의 기능 고도화 (첨부파일, 상태 변경 추적, 알림 처리)
alter table if exists public.user_inquiries
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists last_viewed_at timestamptz,
  add column if not exists status_changed_at timestamptz;

create index if not exists user_inquiries_status_idx
  on public.user_inquiries (status);

create index if not exists user_inquiries_responded_idx
  on public.user_inquiries (responded_at);

create index if not exists user_inquiries_status_changed_idx
  on public.user_inquiries (status_changed_at);

create or replace function public.set_user_inquiries_audit()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    if NEW.status_changed_at is null then
      NEW.status_changed_at = now();
    end if;

    if NEW.updated_at is null then
      NEW.updated_at = now();
    end if;

    return NEW;
  end if;

  NEW.updated_at = now();

  if NEW.status is distinct from OLD.status then
    NEW.status_changed_at = now();
  end if;

  if NEW.response is distinct from OLD.response and NEW.response is not null then
    NEW.responded_at = coalesce(NEW.responded_at, now());
  end if;

  return NEW;
end;
$$;

drop trigger if exists user_inquiries_set_timestamp on public.user_inquiries;

create trigger user_inquiries_set_timestamp
  before insert or update on public.user_inquiries
  for each row
  execute function public.set_user_inquiries_audit();
