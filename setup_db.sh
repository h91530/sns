#!/bin/bash

# Supabase 프로젝트 ID
PROJECT_ID="pkorpzicojwkxcaqlpru"

# SQL 실행
echo "Adding profile columns to users table..."

cat > /tmp/migration.sql << 'SQL'
create extension if not exists "pgcrypto";

alter table users
  add column if not exists avatar text default 'https://via.placeholder.com/150?text=User',
  add column if not exists bio text default '',
  add column if not exists website text default '';

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id integer not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_expires_idx
  on public.password_reset_tokens (user_id, expires_at)
  where used_at is null;
SQL

echo "Migration SQL created at /tmp/migration.sql"
echo ""
echo "Please execute this SQL in Supabase Dashboard:"
echo "1. Go to https://app.supabase.com/project/$PROJECT_ID/sql/new"
echo "2. Copy and paste the SQL from /tmp/migration.sql"
echo "3. Click 'Run'"
echo ""
cat /tmp/migration.sql
