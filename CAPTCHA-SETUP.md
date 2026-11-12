# CAPTCHA e acesso administrativo

## Estado desta entrega

- O painel fica em `admin.html`, sem link e sem campos administrativos no formulário público.
- A página de login é acessível pelo endereço, como qualquer arquivo do GitHub Pages. Os registros exigem autenticação e associação em `public.admins`; o HTML não contém registros.
- A sessão administrativa fica apenas no sessionStorage da aba. O formulário público não lê essa sessão.
- O CAPTCHA está preparado, mas **não está ativo** enquanto a chave pública estiver vazia e a função/migração não estiverem aplicadas no Supabase. Nesse período o envio público anterior continua funcionando.

## 1. Criar o widget Cloudflare

1. Acesse https://dash.cloudflare.com/ e crie ou entre na sua conta.
2. Abra **Turnstile → Add widget**.
3. Nome: `Central de Sugestões e Melhorias`.
4. Hostname permitido: `jhonnymrn.github.io` (sem https e sem caminho).
5. Modo **Managed**. Não é necessário transferir o domínio ou DNS do GitHub Pages para a Cloudflare.
6. Guarde a **Site Key** (pública) e a **Secret Key** (privada). Somente a pública pode ser compartilhada para editar o site.

## 2. Publicar o backend

No projeto Supabase `ybucnycqdantdggvbvpj`:

1. Em **Edge Functions → Secrets**, crie `TURNSTILE_SECRET_KEY` com a Secret Key do widget. Insira diretamente no Supabase; nunca no GitHub nem no chat.
2. Publique `supabase/functions/submit-complaint/index.ts` e `handler.mjs` como a função **submit-complaint**. O segredo administrativo do Supabase fica no ambiente da função, não no navegador.
3. A função é pública para visitantes sem login: configure **Verify JWT = false** somente nesta função. A autorização do envio será o token Turnstile verificado no servidor. O `supabase/config.toml` já declara essa opção para deploy via CLI.
4. Se usar CLI: `supabase functions deploy submit-complaint --project-ref ybucnycqdantdggvbvpj`. Use login interativo no seu computador. Nunca publique tokens de acesso.

## 3. Ativar sem deixar um caminho de desvio

Faça as etapas abaixo na mesma janela de manutenção. Avise quem estiver usando o formulário.

1. Prepare a migração `supabase/migrations/202611120001_captcha_gate.sql` no SQL Editor, mas ainda não execute.
2. Preencha **somente** a Site Key pública em `assets/captcha-config.js`, publique no GitHub e aguarde o Pages concluir. O formulário passará a exigir o desafio e usará a função. Antes de executar a migração, esse novo envio ainda não funciona, pois a RPC não existe.
3. Execute a migração no SQL Editor. Ela cria a RPC de gravação, limita 3 envios por e-mail a cada 10 minutos e revoga a inserção direta para visitantes e usuários comuns. Mantém as contas e os dados existentes, substituindo as políticas das duas tabelas pelas regras restritas desta versão.
4. Teste um envio pelo formulário e confirme o protocolo no painel. Confira um envio sem CPF e telefone.
5. Teste um POST à Edge Function sem token e com token inválido: deve retornar 403. Teste inserção direta com a chave pública: deve ser recusada.
6. Confira com uma conta autenticada que não está em `admins`: não pode ler manifestações nem gravar diretamente. Confirme que as contas administrativas autorizadas continuam lendo.
7. Remova o bloco de compatibilidade `if(!captchaEnabled)` de `enviarManifestacao` após a ativação; a migração já impede esse caminho no banco. Nunca recrie a política `Public can submit complaints` nem execute um schema antigo que reabra INSERT.

Se o CAPTCHA falhar depois de ativado, não há fallback para inserção direta. Não remova RLS nem libere INSERT para contornar o erro.

## Administradores adicionais

Crie a conta em **Supabase → Authentication → Users**, copie o UID e execute no SQL Editor:

```sql
insert into public.admins (user_id)
values ('SUBSTITUA-PELO-UID')
on conflict (user_id) do nothing;
```

Somente pessoas com acesso administrativo ao projeto Supabase devem alterar essa lista. A aplicação não permite autoatribuição de administrador. Retire um acesso removendo a associação pelo SQL Editor; a RLS passa a impedir novas leituras, mas dados já vistos não podem ser apagados de outros dispositivos remotamente.

## Limites e verificações pendentes

- CAPTCHA reduz automação; não garante bloqueio absoluto de spam. O limite por e-mail pode ser contornado por pessoas que usam outros e-mails. Uma camada adicional por IP exigiria obter o IP de uma origem confiável e tratar a retenção desses dados.
- Os hashes do limitador ficam em tabela privada e não são enviados ao navegador. Defina limpeza periódica de entradas antigas conforme a política de retenção.
- Revogue a chave secreta exposta anteriormente e desative cadastro público no Supabase Auth se todas as contas forem criadas pela administração.
- Não foram testados nesta entrega: deploy real da função, execução real da migração, desafio Cloudflare real e acesso com credenciais administrativas. Dependem da configuração das contas.

Referências: https://supabase.com/docs/guides/functions/examples/cloudflare-turnstile e https://developers.cloudflare.com/turnstile/get-started/server-side-validation/.