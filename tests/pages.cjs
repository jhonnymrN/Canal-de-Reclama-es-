const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function element(){return {value:'',textContent:'',innerHTML:'',hidden:false,checked:false,listeners:{},addEventListener(e,fn){this.listeners[e]=fn},setAttribute(){},removeAttribute(){},setSelectionRange(){}}}
const html=fs.readFileSync('admin.html','utf8'),script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
async function adminTest(isAdmin){
 const els={},get=id=>els[id]??=element();get('adm').hidden=true;
 let authCallback,readCount=0;const session={user:{id:'user-test'}};
 const client={
   auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>authCallback=fn,signOut:async()=>({error:null}),signInWithPassword:async()=>({error:null})},
   from(table){
     if(table==='admins')return {select:()=>({eq:()=>({maybeSingle:async()=>({data:isAdmin?{user_id:'user-test'}:null,error:null})})})};
     return {select:()=>({order:async()=>{readCount++;return {data:[],error:null}}})};
   }
 };
 vm.runInNewContext(script,{window:{sessionStorage:{},supabase:{createClient:()=>client}},document:{getElementById:get,createElement:element}});
 await tick();assert.equal(readCount,isAdmin?1:0);assert.equal(get('adm').hidden,!isAdmin);
 if(!isAdmin)assert.ok(get('loginError').textContent.includes('não tem acesso'));
 get('lista').textContent='dados privados';get('adminPassword').value='ficticia';authCallback('SIGNED_OUT');assert.equal(get('lista').textContent,'');assert.equal(get('adm').hidden,true);assert.equal(get('adminPassword').value,'');
}
(async()=>{
 await adminTest(false);await adminTest(true);
 const p=fs.readFileSync('Site-reclamacoes/Sugestões e melhorias.html','utf8');assert.equal(/id="adminLogin"|id="adm"|signInWithPassword|from\("admins"\)|admin\.html/.test(p),false);
 const pscript=p.match(/<script>\s*([\s\S]*?)<\/script>/)[1];let sent=[],fetches=[],widgetOptions,authOptions,failNetwork=false;
 const els={},get=id=>els[id]??=element();
 const context={window:{CENTRAL_CAPTCHA:{siteKey:'PUBLIC-TEST-KEY'},supabase:{createClient:(url,key,opts)=>{authOptions=opts;return {from:()=>({insert:async row=>{sent.push(row);return {error:null}}})}}}},document:{getElementById:get,createElement:element,head:{appendChild(){}}},fetch:async(url,options)=>{fetches.push(options);if(failNetwork)throw new Error('offline');return {ok:true,json:async()=>({protocolo:'REC-SERVER-TEST'})}}};
 const lib={};vm.runInNewContext(fs.readFileSync('assets/vendor/cpf-1.0.2.min.js','utf8'),lib);context.window.CPF=lib.CPF;
 vm.runInNewContext(pscript,context);assert.equal(authOptions.auth.persistSession,false);
 context.window.turnstile={render:(target,opts)=>{widgetOptions=opts;return 0},reset:()=>{}};context.window.centralCaptchaReady();
 get('nome').value='Pessoa Teste';get('email').value='teste@example.invalid';get('texto').value='Texto fictício para testes do formulário.';get('lgpd').checked=true;get('tipo').value='Outros';
 await get('enviar').listeners.click();assert.equal(fetches.length,0);assert.ok(get('eCaptcha').textContent);
 widgetOptions.callback('token');await get('enviar').listeners.click();assert.equal(fetches.length,1);assert.equal(sent.length,0);assert.equal(get('proto').textContent,'REC-SERVER-TEST');
 widgetOptions['expired-callback']();await get('enviar').listeners.click();assert.equal(fetches.length,1);
 failNetwork=true;widgetOptions.callback('new-token');await get('enviar').listeners.click();assert.equal(fetches.length,2);assert.equal(sent.length,0);assert.ok(get('eGeral').textContent.includes('Não foi possível'));
 console.log('PASS: público sem painel/login; conta não administradora bloqueada antes de consultar registros; administrador autorizado; limpeza ao sair; CAPTCHA sem token/expirado bloqueia; modo CAPTCHA envia só à função e usa protocolo do servidor.');
})();