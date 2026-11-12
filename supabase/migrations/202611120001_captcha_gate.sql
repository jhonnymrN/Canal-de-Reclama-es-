-- ATIVAR APENAS depois de publicar a função submit-complaint e configurar o widget.
-- O formulário antigo deixa de enviar ao banco quando esta migração for aplicada.
begin;

create schema if not exists private;
create table if not exists private.complaint_rate_limits (
  email_hash text primary key,
  window_start timestamptz not null,
  attempts integer not null check (attempts between 1 and 3)
);
alter table private.complaint_rate_limits enable row level security;
revoke all on private.complaint_rate_limits from public, anon, authenticated;

create or replace function public.submit_verified_complaint(
  p_nome text, p_email text, p_cpf text, p_telefone text, p_assunto text, p_texto text
)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_attempts integer;
  v_protocolo text := 'REC-' || upper(replace(gen_random_uuid()::text, '-', ''));
begin
  if char_length(p_nome) not between 5 and 120
    or char_length(p_email) not between 5 and 254
    or char_length(p_texto) not between 20 and 5000
    or p_nome is null or p_email is null or p_texto is null or p_assunto is null
  then raise exception 'invalid_fields'; end if;

  -- Limite por e-mail: 3 envios por janela de 10 minutos, inclusive sob concorrência.
  insert into private.complaint_rate_limits as limits (email_hash, window_start, attempts)
  values (encode(sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex'), now(), 1)
  on conflict (email_hash) do update
  set attempts = case when limits.window_start <= now() - interval '10 minutes' then 1 else limits.attempts + 1 end,
      window_start = case when limits.window_start <= now() - interval '10 minutes' then now() else limits.window_start end
  where limits.window_start <= now() - interval '10 minutes' or limits.attempts < 3
  returning attempts into v_attempts;
  if not found then raise exception 'rate_limit_exceeded'; end if;

  insert into public.complaints (protocolo, nome, email, cpf, telefone, assunto, texto)
  values (v_protocolo, p_nome, p_email, p_cpf, p_telefone, p_assunto, p_texto);
  return v_protocolo;
end;
$$;
revoke all on function public.submit_verified_complaint(text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_verified_complaint(text,text,text,text,text,text) to service_role;

-- Substitui as políticas existentes pelas regras fechadas desta versão.
-- Não altera registros ou a lista de administradores.
do $$ declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('complaints', 'admins')
  loop execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename); end loop;
end $$;

alter table public.complaints enable row level security;
alter table public.admins enable row level security;
revoke all on public.complaints from public, anon, authenticated;
revoke all on public.admins from public, anon, authenticated;
grant select on public.complaints, public.admins to authenticated;
grant insert on public.complaints to service_role;

create or replace function public.is_complaints_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_complaints_admin() from public, anon;
grant execute on function public.is_complaints_admin() to authenticated;
create policy "Admins can read complaints" on public.complaints
for select to authenticated using (public.is_complaints_admin());
create policy "Admins can read own admin record" on public.admins
for select to authenticated using (user_id = (select auth.uid()));
commit;