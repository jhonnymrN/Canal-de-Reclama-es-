import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHandler} from '../supabase/functions/submit-complaint/handler.mjs';
const scope={};vm.runInNewContext(fs.readFileSync('assets/vendor/cpf-1.0.2.min.js','utf8'),scope);
const env={TURNSTILE_SECRET_KEY:'secret-for-unit-test',SUPABASE_URL:'https://project.test',SUPABASE_SERVICE_ROLE_KEY:'server-key-for-unit-test'};
const body={nome:'Pessoa Teste',email:'teste@example.invalid',cpf:null,telefone:null,assunto:'Outros',texto:'Manifestação fictícia para teste automatizado.',consentimento:true,captchaToken:'test-token'};
let calls=[];let validation={success:true,hostname:'jhonnymrn.github.io',action:'submit-complaint'},dbStatus=200,dbValue='REC-'+ 'A'.repeat(32);
const mockFetch=async(url,opts)=>{calls.push({url,opts});return url.includes('siteverify')?new Response(JSON.stringify(validation)):new Response(JSON.stringify(dbValue),{status:dbStatus})};
const handler=createHandler(env,{fetch:mockFetch,validateCPF:value=>scope.CPF.isValid(value,true)});
const request=(data=body,origin='https://jhonnymrn.github.io')=>new Request('https://example.test/submit-complaint',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(data)});
assert.equal((await handler(request(body,'https://evil.test'))).status,403);assert.equal(calls.length,0);
assert.equal((await handler(request({...body,captchaToken:''}))).status,403);assert.equal(calls.length,0);
assert.equal((await handler(request({...body,consentimento:false}))).status,400);
assert.equal((await handler(request({...body,cpf:'00000000000'}))).status,400);
assert.equal((await handler(request({...body,texto:'x'.repeat(25000)}))).status,413);
assert.equal((await handler(new Request('https://example.test',{method:'POST',headers:{origin:'https://jhonnymrn.github.io','content-type':'application/json'},body:'broken'}))).status,400);
for(const failure of [{success:false},{success:true,hostname:'evil.test',action:'submit-complaint'},{success:true,hostname:'jhonnymrn.github.io',action:'login'}]){validation=failure;calls=[];assert.equal((await handler(request())).status,403);assert.equal(calls.length,1)}
validation={success:true,hostname:'jhonnymrn.github.io',action:'submit-complaint'};
for(const contact of [{cpf:null,telefone:null},{cpf:'53282085796',telefone:'11999999999'}]){calls=[];const r=await handler(request({...body,...contact}));assert.equal(r.status,201);assert.equal((await r.json()).protocolo,dbValue);assert.equal(calls.length,2);const saved=JSON.parse(calls[1].opts.body);assert.equal(saved.p_cpf,contact.cpf);assert.equal(saved.p_telefone,contact.telefone)}
dbStatus=400;dbValue={message:'rate_limit_exceeded'};assert.equal((await handler(request())).status,429);
dbValue={message:'internal database detail'};let r=await handler(request());assert.equal(r.status,503);assert.equal((await r.text()).includes('internal'),false);
assert.equal((await createHandler({}, {fetch:mockFetch})(request())).status,503);
assert.equal((await createHandler(env,{fetch:async()=>{throw new Error('secret')},validateCPF:()=>true})(request())).status,503);
console.log('PASS: CAPTCHA obrigatório no backend; rejeição de token, origem, hostname e ação; validação de CPF/dados; limite de corpo; envio com/sem opcionais; 429; falhas fechadas e erros sem detalhes privados.');