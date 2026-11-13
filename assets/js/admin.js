(function(){
  "use strict";
  var SUPABASE_URL = "https://ybucnycqdantdggvbvpj.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_Fc3wpHgR97igffUgSK7u0Q_YM6WUihH";
  var $=function(id){return document.getElementById(id)};
  var client=null,todas=[],generation=0;
  function erro(id,msg){$(id).textContent=msg||""}
  function esc(s){var d=document.createElement("div");d.textContent=String(s==null?"":s);return d.innerHTML}
  function limpar(){
    generation++;todas=[];$("lista").textContent="";$("cont").textContent="";
    $("adminPassword").value="";$("adm").hidden=true;$("adminLogin").hidden=false;
  }
  function render(){
    var q=$("busca").value.trim().toLowerCase(),digits=q.replace(/\D/g,"");
    var l=todas.filter(function(r){
      return !q||[r.nome,r.email,r.protocolo,r.assunto,r.texto].some(function(v){return String(v||"").toLowerCase().indexOf(q)>-1})
        ||(digits&&/^[\d\s.()+-]+$/.test(q)&&[r.cpf,r.telefone].some(function(v){return String(v||"").replace(/\D/g,"").indexOf(digits)>-1}));
    });
    $("cont").textContent="("+l.length+" de "+todas.length+")";
    $("lista").innerHTML=l.length?l.map(function(r){
      var d=new Date(r.criado_em).toLocaleString("pt-BR");
      return '<div class="item"><strong>'+esc(r.nome)+'</strong><span class="tag">'+esc(r.assunto)+'</span><div class="meta">'+esc(r.email)+(r.cpf?' · CPF: '+esc(r.cpf):'')+(r.telefone?' · Telefone: '+esc(r.telefone):'')+' · '+esc(d)+' · '+esc(r.protocolo)+'</div><p class="msg">'+esc(r.texto)+'</p></div>';
    }).join(""):'<p class="meta">Nenhuma manifestação encontrada.</p>';
  }
  async function carregarPainel(){
    limpar();var ticket=generation;
    try{
      var session=await client.auth.getSession();
      if(ticket!==generation||!session.data.session)return;
      var admin=await client.from("admins").select("user_id").eq("user_id",session.data.session.user.id).maybeSingle();
      if(ticket!==generation)return;
      if(admin.error||!admin.data){erro("loginError","Esta conta não tem acesso administrativo.");return}
      var result=await client.from("complaints").select("id,protocolo,nome,email,cpf,telefone,assunto,texto,criado_em").order("criado_em",{ascending:false});
      if(ticket!==generation)return;
      if(result.error)throw result.error;
      todas=result.data||[];render();$("adm").hidden=false;$("adminLogin").hidden=true;
    }catch(e){if(ticket===generation)erro("adminError","Não foi possível carregar o painel. Verifique sua conexão e suas permissões.")}
  }
  $("busca").addEventListener("input",render);
  $("entrar").addEventListener("click",async function(){
    erro("loginError","");erro("adminError","");
    if(!client){erro("loginError","Não foi possível carregar o sistema. Recarregue a página.");return}
    var btn=this;btn.disabled=true;btn.textContent="Entrando...";
    try{
      var result=await client.auth.signInWithPassword({email:$("adminEmail").value.trim(),password:$("adminPassword").value});
      $("adminPassword").value="";
      if(result.error)erro("loginError","Não foi possível entrar. Confira o e-mail e a senha.");
      else await carregarPainel();
    }catch(e){erro("loginError","Não foi possível entrar. Tente novamente.")}
    finally{btn.disabled=false;btn.textContent="Entrar no painel"}
  });
  $("sair").addEventListener("click",async function(){
    limpar();erro("adminError","");
    try{
      var result=await client.auth.signOut({scope:"local"});
      if(result.error)throw result.error;
    }catch(e){erro("adminError","O painel foi limpo, mas não foi possível encerrar a sessão. Feche esta aba para descartar a sessão local.")}
  });
  if(!window.supabase){erro("loginError","Não foi possível carregar o sistema. Recarregue a página.");return}
  // Sessão apenas nesta aba; nunca é carregada pelo formulário público.
  client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
    auth:{storage:window.sessionStorage,storageKey:"central-admin-auth",persistSession:true,detectSessionInUrl:false}
  });
  client.auth.onAuthStateChange(function(event){if(event==="SIGNED_OUT")limpar()});
  carregarPainel();
})();
