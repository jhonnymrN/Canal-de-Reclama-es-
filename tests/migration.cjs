const {PGlite}=require('@electric-sql/pglite');
const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`);
 await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/migrations/202611120001_captcha_gate.sql','utf8'));
 // A migração também precisa ser reexecutável.
 await db.exec(fs.readFileSync('supabase/migrations/202611120001_captcha_gate.sql','utf8'));
 const admin='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
 await db.query('insert into auth.users values ($1),($2)',[admin,other]);await db.query('insert into public.admins(user_id) values($1)',[admin]);
 const args=['Pessoa Teste','teste@example.invalid',null,null,'Outros','Texto fictício para teste automatizado.'];
 await db.exec('set role service_role');
 for(let i=0;i<3;i++){const r=await db.query('select public.submit_verified_complaint($1,$2,$3,$4,$5,$6) as protocolo',args);assert.match(r.rows[0].protocolo,/^REC-[A-F0-9]{32}$/)}
 await assert.rejects(()=>db.query('select public.submit_verified_complaint($1,$2,$3,$4,$5,$6)',args),/rate_limit_exceeded/);
 await db.exec('reset role;set role anon');
 await assert.rejects(()=>db.query('select * from public.complaints'),/permission denied/);
 await assert.rejects(()=>db.query('select public.submit_verified_complaint($1,$2,$3,$4,$5,$6)',args),/permission denied/);
 await db.exec('reset role;set role authenticated');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);
 assert.equal((await db.query('select * from public.complaints')).rows.length,0);
 assert.equal((await db.query('select * from public.admins')).rows.length,0);
 await assert.rejects(()=>db.query('insert into public.admins(user_id) values($1)',[other]),/permission denied/);
 await assert.rejects(()=>db.query('select public.submit_verified_complaint($1,$2,$3,$4,$5,$6)',args),/permission denied/);
 await assert.rejects(()=>db.query("insert into public.complaints(protocolo,nome,email,assunto,texto) values('BYPASS','Pessoa Teste','a@b.invalid','Outros','Texto fictício suficientemente longo')"),/permission denied/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[admin]);
 assert.equal((await db.query('select * from public.complaints')).rows.length,3);
 assert.equal((await db.query('select * from public.admins')).rows.length,1);
 await db.close();console.log('PASS PostgreSQL/PGlite: migração reexecutável; RPC exclusiva do servidor; limite de 3; leitura/inserção anônima bloqueadas; não administrador sem leitura/escrita; administrador lê registros.');
})();