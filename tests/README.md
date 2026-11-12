# Verificação local

Execute `npm install` e `npm test` na raiz. Os testes usam mocks para Cloudflare/Supabase e PostgreSQL embarcado (PGlite) para a migração e as permissões. Não acessam produção nem usam credenciais reais. O site continua estático, sem etapa de build ou dependência de npm na publicação.
