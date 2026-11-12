// Sem logs de tokens, chaves ou dados pessoais. Dependências injetáveis para testes.
export function createHandler(env, {fetch: request = fetch, validateCPF} = {}) {
  const origin = 'https://jhonnymrn.github.io';
  const headers = {'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', 'Vary': 'Origin'};
  const reply = (status, error, extra = {}) => new Response(JSON.stringify(error ? {error} : extra), {status, headers: {...headers, 'Content-Type': 'application/json'}});
  return async function handler(req) {
    if (req.headers.get('origin') !== origin) return reply(403, 'origin_not_allowed');
    if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (req.method !== 'POST') return reply(405, 'method_not_allowed');
    if (!env.TURNSTILE_SECRET_KEY || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return reply(503, 'not_configured');
    if (!(req.headers.get('content-type') || '').startsWith('application/json')) return reply(415, 'json_required');
    if (Number(req.headers.get('content-length')) > 24000) return reply(413, 'request_too_large');
    let input;
    try {
      // Limita o corpo inclusive quando o cliente não informa Content-Length.
      const reader = req.body?.getReader();
      if (!reader) return reply(400, 'invalid_body');
      const chunks = []; let length = 0;
      while (true) {const {done, value} = await reader.read(); if (done) break; length += value.length; if (length > 24000) {await reader.cancel(); return reply(413, 'request_too_large')} chunks.push(value)}
      const bytes = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) {bytes.set(chunk, offset); offset += chunk.length}
      input = JSON.parse(new TextDecoder().decode(bytes));
    } catch {return reply(400, 'invalid_json')}
    if (!input || typeof input !== 'object' || Array.isArray(input)) return reply(400, 'invalid_body');
    const text = name => typeof input[name] === 'string' ? input[name].trim() : '';
    const nome = text('nome').replace(/\s+/g, ' '), email = text('email'), cpf = text('cpf'), telefone = text('telefone'), assunto = text('assunto'), texto = text('texto'), token = text('captchaToken');
    const assuntos = ['Atendimento','Conteúdo / aulas','Professores / instrutores','Plataforma / acesso','Financeiro / pagamentos','Outros'];
    if (nome.length < 5 || nome.length > 120 || !nome.includes(' ') || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || texto.length < 20 || texto.length > 5000 || !assuntos.includes(assunto) || input.consentimento !== true) return reply(400, 'invalid_fields');
    if ((cpf && (!/^\d{11}$/.test(cpf) || !validateCPF(cpf))) || (telefone && !/^\d{10,11}$/.test(telefone))) return reply(400, 'invalid_contact');
    if (!token || token.length > 2048) return reply(403, 'captcha_required');
    try {
      const verification = await request('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(10000)
      });
      if (!verification.ok) return reply(503, 'verification_unavailable');
      const result = await verification.json();
      if (!result.success || result.hostname !== 'jhonnymrn.github.io' || result.action !== 'submit-complaint') return reply(403, 'captcha_invalid');
      // A RPC é exclusiva de service_role; visitantes não podem gravar diretamente.
      const saved = await request(env.SUPABASE_URL + '/rest/v1/rpc/submit_verified_complaint', {
        method:'POST', headers:{'Content-Type':'application/json',apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY},
        body:JSON.stringify({p_nome:nome,p_email:email,p_cpf:cpf||null,p_telefone:telefone||null,p_assunto:assunto,p_texto:texto}),signal:AbortSignal.timeout(10000)
      });
      if (!saved.ok) {const failure = await saved.json().catch(()=>({})); return failure.message === 'rate_limit_exceeded' ? reply(429,'rate_limited') : reply(503,'save_failed')}
      const protocolo = await saved.json();
      if (typeof protocolo !== 'string' || !/^REC-[A-F0-9]{32}$/.test(protocolo)) return reply(503, 'invalid_receipt');
      return reply(201, null, {protocolo});
    } catch {return reply(503, 'temporarily_unavailable')}
  };
}