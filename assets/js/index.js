(function(){
  "use strict";
  // Preencha estes dois campos com os dados públicos do seu projeto Supabase.
  // Nunca coloque aqui a chave service_role ou qualquer senha administrativa.
  var SUPABASE_URL = "https://ybucnycqdantdggvbvpj.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_Fc3wpHgR97igffUgSK7u0Q_YM6WUihH";
  var $=function(id){return document.getElementById(id)};
  var client=null;
  function erro(id,msg){$(id).textContent=msg||""}
  function configurar(){
    if(!window.supabase||SUPABASE_URL.indexOf("https://")!==0||SUPABASE_ANON_KEY.indexOf("COLE_")===0)return false;
    client=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    return true;
  }
  function protocolo(){return "REC-"+Date.now().toString(36).toUpperCase()+"-"+Math.random().toString(36).slice(2,6).toUpperCase()}
  function validarCPF(v){return !!window.CPF && window.CPF.isValid(v, true)}
  function mascaraCPF(v){
    return v.replace(/\D/g,"").slice(0,11).replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2");
  }
  $("cpf").addEventListener("input",function(){
    var pos=this.selectionStart, digits=this.value.slice(0,pos).replace(/\D/g,"").length;
    this.value=mascaraCPF(this.value);
    var caret=0,count=0;
    while(caret<this.value.length&&count<digits){if(/\d/.test(this.value[caret]))count++;caret++}
    this.setSelectionRange(caret,caret);
    erro("eCpf","");this.removeAttribute("aria-invalid");
  });
  var captchaConfig=window.CENTRAL_CAPTCHA||{}, captchaToken="", captchaWidget=null;
  var captchaEnabled=!!(captchaConfig.enabled&&captchaConfig.siteKey);
  function resetCaptcha(){
    captchaToken="";
    if(window.turnstile&&captchaWidget!==null)window.turnstile.reset(captchaWidget);
  }
  window.centralCaptchaReady=function(){
    captchaWidget=window.turnstile.render("#captcha",{
      sitekey:captchaConfig.siteKey,action:"submit-complaint",language:"pt-br",
      callback:function(token){captchaToken=token;erro("eCaptcha","")},
      "expired-callback":function(){captchaToken="";erro("eCaptcha","A verificação expirou. Faça novamente.")},
      "error-callback":function(){captchaToken="";erro("eCaptcha","Não foi possível verificar. Recarregue a página.")}
    });
  };
  if(captchaEnabled){
    var script=document.createElement("script");
    script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=centralCaptchaReady&render=explicit";
    script.async=true;script.defer=true;
    script.onerror=function(){erro("eCaptcha","Não foi possível carregar a verificação. Recarregue a página.")};
    document.head.appendChild(script);
  }
  async function enviarManifestacao(row){
    if(!captchaEnabled){
      // Compatibilidade temporária durante a ativação. Remover após a migração CAPTCHA.
      var legacy=await client.from("complaints").insert(row);
      if(legacy.error)throw legacy.error;
      return row.protocolo;
    }
    var response=await fetch(SUPABASE_URL+"/functions/v1/submit-complaint",{
      method:"POST",headers:{"Content-Type":"application/json",apikey:SUPABASE_ANON_KEY},
      body:JSON.stringify({nome:row.nome,email:row.email,cpf:row.cpf,telefone:row.telefone,assunto:row.assunto,texto:row.texto,consentimento:true,captchaToken:captchaToken})
    });
    var data=await response.json();
    if(!response.ok||!data.protocolo){
      var failure=new Error("Falha ao enviar");failure.status=response.status;throw failure;
    }
    return data.protocolo;
  }
  var ultimoProtocolo="";
  var old=$("enviar");
  old.addEventListener("click",async function(){
    ["eNome","eCpf","eEmail","eTexto","eLgpd","eGeral","eGeralForm","eCaptcha"].forEach(function(id){erro(id,"")});
    var nome=$("nome").value.trim().replace(/\s+/g," "),email=$("email").value.trim(),cpf=$("cpf").value.replace(/\D/g,""),telefone=$("telefone").value.replace(/\D/g,""),texto=$("texto").value.trim(),ok=true;
    if(nome.length<5||nome.split(" ").length<2){erro("eNome","Informe seu nome completo.");ok=false}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){erro("eEmail","Informe um e-mail válido.");ok=false}
    if(cpf&&!validarCPF(cpf)){erro("eCpf",window.CPF?"O CPF informado não é válido. Confira os números.":"Não foi possível carregar a validação de CPF. Recarregue a página.");$("cpf").setAttribute("aria-invalid","true");ok=false}
    if(telefone&&telefone.length!==10&&telefone.length!==11){erro("eGeralForm","Informe um telefone com DDD válido ou deixe o campo em branco.");ok=false}
    if(texto.length===0){erro("eTexto","Conte sua experiência ou opinião.");ok=false}
    if(!$("lgpd").checked){erro("eLgpd","É necessário autorizar o uso dos dados.");ok=false}
    if(captchaEnabled&&!captchaToken){erro("eCaptcha","Conclua a verificação de segurança antes de enviar.");ok=false}
    if(!ok)return;
    if(!client){erro("eGeralForm","O sistema ainda está sendo configurado. Tente novamente mais tarde.");return}
    old.disabled=true;old.textContent="Enviando...";ultimoProtocolo=protocolo();
    try{
      ultimoProtocolo=await enviarManifestacao({protocolo:ultimoProtocolo,nome:nome,email:email,cpf:cpf||null,telefone:telefone||null,assunto:$("tipo").value,texto:texto});
      $("proto").textContent=ultimoProtocolo;$("formBox").hidden=true;$("done").hidden=false;
    }catch(e){erro("eGeralForm",e.status===429?"Você enviou várias opiniões em pouco tempo. Aguarde alguns minutos.":e.status===403?"A verificação de segurança falhou. Faça novamente.":"Não foi possível enviar. Verifique sua conexão e tente novamente.")}
    if(captchaEnabled)resetCaptcha();
    old.disabled=false;old.textContent="Enviar opinião";
  });
  $("nova").addEventListener("click",function(){
    ["nome","email","cpf","telefone","texto"].forEach(function(id){$(id).value=""});$("lgpd").checked=false;
    $("done").hidden=true;$("formBox").hidden=false;
  });
  /* Select customizado: mantém o <select id="tipo"> como fonte do valor e troca só a interface */
  function criarSelect(select){
    if(!select)return;
    var opts=Array.prototype.slice.call(select.options);
    var wrap=document.createElement("div");wrap.className="sel";
    select.parentNode.insertBefore(wrap,select);wrap.appendChild(select);
    select.className+=" sel-native";select.tabIndex=-1;select.setAttribute("aria-hidden","true");
    var trigger=document.createElement("button");
    trigger.type="button";trigger.className="sel-trigger";trigger.id=select.id+"Btn";
    trigger.setAttribute("role","combobox");trigger.setAttribute("aria-haspopup","listbox");
    trigger.setAttribute("aria-expanded","false");trigger.setAttribute("aria-controls",select.id+"List");
    var label=document.querySelector('label[for="'+select.id+'"]');
    if(label){if(!label.id)label.id=select.id+"Label";trigger.setAttribute("aria-labelledby",label.id);label.setAttribute("for",trigger.id)}
    var valor=document.createElement("span");valor.className="sel-value";
    var seta=document.createElement("i");seta.className="ph ph-caret-down";seta.setAttribute("aria-hidden","true");
    trigger.appendChild(valor);trigger.appendChild(seta);
    var list=document.createElement("ul");list.className="sel-list";list.id=select.id+"List";list.setAttribute("role","listbox");
    if(label)list.setAttribute("aria-labelledby",label.id);
    var items=opts.map(function(o,i){
      var li=document.createElement("li");li.className="sel-opt";li.id=select.id+"Opt"+i;
      li.setAttribute("role","option");li.setAttribute("data-i",i);li.textContent=o.text;
      list.appendChild(li);return li;
    });
    wrap.appendChild(trigger);wrap.appendChild(list);
    var aberto=false,ativo=select.selectedIndex<0?0:select.selectedIndex,busca="",buscaTimer=null;
    function atualizar(){
      valor.textContent=opts[select.selectedIndex]?opts[select.selectedIndex].text:"";
      items.forEach(function(li,i){li.setAttribute("aria-selected",i===select.selectedIndex?"true":"false")});
    }
    function destacar(i,rolar){
      ativo=Math.max(0,Math.min(items.length-1,i));
      items.forEach(function(li,n){li.classList.toggle("is-active",n===ativo)});
      trigger.setAttribute("aria-activedescendant",items[ativo].id);
      if(rolar){
        var li=items[ativo];
        if(li.offsetTop<list.scrollTop)list.scrollTop=li.offsetTop-6;
        else if(li.offsetTop+li.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTop=li.offsetTop+li.offsetHeight-list.clientHeight+6;
      }
    }
    function abrir(){
      if(aberto)return;
      aberto=true;wrap.classList.add("open");trigger.setAttribute("aria-expanded","true");
      var r=trigger.getBoundingClientRect(),h=list.offsetHeight+12;
      wrap.classList.toggle("sel-up",window.innerHeight-r.bottom<h&&r.top>window.innerHeight-r.bottom);
      destacar(select.selectedIndex<0?0:select.selectedIndex,true);
    }
    function fechar(){
      if(!aberto)return;
      aberto=false;wrap.classList.remove("open");trigger.setAttribute("aria-expanded","false");
      trigger.removeAttribute("aria-activedescendant");
    }
    function escolher(i){
      if(select.selectedIndex!==i){select.selectedIndex=i;select.dispatchEvent(new Event("change",{bubbles:true}))}
      atualizar();fechar();
    }
    trigger.addEventListener("click",function(){trigger.focus();aberto?fechar():abrir()});
    trigger.addEventListener("blur",fechar);
    trigger.addEventListener("keydown",function(e){
      var k=e.key;
      if(k==="ArrowDown"||k==="ArrowUp"){
        e.preventDefault();
        if(!aberto)abrir();else destacar(ativo+(k==="ArrowDown"?1:-1),true);
      }else if(k==="Home"||k==="End"){
        if(aberto){e.preventDefault();destacar(k==="Home"?0:items.length-1,true)}
      }else if(k==="Enter"||k===" "){
        e.preventDefault();
        if(aberto)escolher(ativo);else abrir();
      }else if(k==="Escape"){
        if(aberto){e.preventDefault();fechar()}
      }else if(k==="Tab"){
        fechar();
      }else if(k.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        busca+=k.toLowerCase();clearTimeout(buscaTimer);buscaTimer=setTimeout(function(){busca=""},600);
        for(var n=0;n<opts.length;n++){
          var idx=(ativo+1+n)%opts.length;
          if(opts[idx].text.toLowerCase().indexOf(busca)===0){aberto?destacar(idx,true):escolher(idx);break}
        }
      }
    });
    list.addEventListener("mousedown",function(e){e.preventDefault()});
    list.addEventListener("mousemove",function(e){
      var li=e.target.closest(".sel-opt");
      if(li&&+li.getAttribute("data-i")!==ativo)destacar(+li.getAttribute("data-i"),false);
    });
    list.addEventListener("click",function(e){
      var li=e.target.closest(".sel-opt");
      if(li)escolher(+li.getAttribute("data-i"));
    });
    document.addEventListener("pointerdown",function(e){
      if(!wrap.contains(e.target)&&!(label&&label.contains(e.target)))fechar();
    });
    // Mantém o texto exibido sincronizado se o navegador restaurar/autopreencher o valor do <select>
    select.addEventListener("change",atualizar);
    window.addEventListener("pageshow",atualizar);
    atualizar();
  }
  criarSelect($("tipo"));
  configurar();
})();