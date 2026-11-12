// Somente a chave PÚBLICA do Turnstile. Nunca colocar uma secret key aqui.
// Vazio = ativação pendente: o formulário mantém o envio anterior, SEM proteção CAPTCHA.
// Preencher só depois de configurar a Edge Function e preparar a migração do banco.
window.CENTRAL_CAPTCHA = Object.freeze({siteKey: ""});