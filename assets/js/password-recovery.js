(function(){
  "use strict";
  var query=new URLSearchParams(window.location.search);
  var hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
  var recoveryRequested=query.get("type")==="recovery"||hash.get("type")==="recovery"||query.has("code");
  if(!recoveryRequested)return;
  var $=function(id){return document.getElementById(id)};
  var panel=$("passwordRecovery"),loading=$("passwordRecoveryLoading"),form=$("passwordRecoveryForm"),done=$("passwordRecoveryDone");
  if(!panel||!window.supabase)return;
  panel.hidden=false;
  var client=window.supabase.createClient("https://ybucnycqdantdggvbvpj.supabase.co","sb_publishable_Fc3wpHgR97igffUgSK7u0Q_YM6WUih",{
    auth:{storage:window.sessionStorage,storageKey:"central-admin-recovery",persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  var ready=false;
  function showForm(){
    if(ready)return;
    ready=true;loading.hidden=true;form.hidden=false;
    try{window.history.replaceState(null,document.title,window.location.pathname)}catch(e){}
    $("newAdminPassword").focus();
  }
  function expired(){
    if(ready)return;
    loading.textContent="Este link expirou ou não é válido. Solicite outro link de recuperação ao administrador do projeto.";
  }
  client.auth.onAuthStateChange(function(event,session){
    if(session&&(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"||event==="INITIAL_SESSION"))showForm();
  });
  client.auth.getSession().then(function(result){
    if(result.data&&result.data.session)showForm();
    else window.setTimeout(expired,8000);
  }).catch(function(){window.setTimeout(expired,8000)});
  form.addEventListener("submit",async function(event){
    event.preventDefault();
    $("passwordRecoveryError").textContent="";
    var password=$("newAdminPassword").value,confirm=$("confirmAdminPassword").value;
    if(password.length<12){$("passwordRecoveryError").textContent="Use uma senha com pelo menos 12 caracteres.";return}
    if(password!==confirm){$("passwordRecoveryError").textContent="As senhas não correspondem.";return}
    var button=$("saveNewPassword");button.disabled=true;button.textContent="Atualizando…";
    try{
      var result=await client.auth.updateUser({password:password});
      if(result.error)throw result.error;
      form.hidden=true;done.hidden=false;
      $("newAdminPassword").value="";$("confirmAdminPassword").value="";
      await client.auth.signOut({scope:"local"});
    }catch(e){
      $("passwordRecoveryError").textContent="Não foi possível atualizar a senha. Recarregue a página e solicite outro link se ele tiver expirado.";
    }finally{button.disabled=false;button.textContent="Salvar nova senha"}
  });
})();