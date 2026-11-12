-- Central de Sugestões e Melhorias
-- Execute este arquivo no SQL Editor do Supabase.

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  nome text not null,
  email text not null,
  assunto text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now()
);

alter table public.complaints enable row level security;
alter table public.admins enable row level security;

-- A função verifica a lista de administradores sem expor a tabela admins ao público.
create or replace function public.is_complaints_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_complaints_admin() from public;
grant execute on function public.is_complaints_admin() to authenticated;

-- Qualquer visitante pode enviar uma manifestação. Visitantes não podem ler.
drop policy if exists "Public can submit complaints" on public.complaints;
create policy "Public can submit complaints"
on public.complaints for insert
to anon, authenticated
with check (
  char_length(nome) between 5 and 120
  and char_length(email) between 5 and 254
  and char_length(texto) between 20 and 5000
  and char_length(protocolo) between 5 and 40
);

drop policy if exists "Admins can read complaints" on public.complaints;
create policy "Admins can read complaints"
on public.complaints for select
to authenticated
using (public.is_complaints_admin());

-- Administradores podem consultar a própria associação; nenhuma leitura pública.
drop policy if exists "Admins can read own admin record" on public.admins;
create policy "Admins can read own admin record"
on public.admins for select
to authenticated
using (user_id = (select auth.uid()));

grant insert on public.complaints to anon, authenticated;
grant select on public.complaints to authenticated;
grant select on public.admins to authenticated;

-- Não há permissão pública para alterar ou apagar reclamações.
