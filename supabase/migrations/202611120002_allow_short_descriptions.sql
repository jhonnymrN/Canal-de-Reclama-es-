-- A descrição continua obrigatória, mas não exige mais 20 caracteres.
begin;
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
    or char_length(p_texto) not between 1 and 5000
    or p_nome is null or p_email is null or p_texto is null or p_assunto is null
  then raise exception 'invalid_fields'; end if;

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
commit;
