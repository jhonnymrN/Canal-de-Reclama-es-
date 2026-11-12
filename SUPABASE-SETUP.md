# Configuração do Supabase — Central de Sugestões e Melhorias

O site estático do GitHub Pages não possui banco de dados nem autenticação próprios. Esta versão usa Supabase para guardar manifestações e proteger o painel administrativo.

> O projeto já está configurado. Para ativar CAPTCHA e consultar o endereço administrativo, siga [CAPTCHA-SETUP.md](CAPTCHA-SETUP.md). Não reexecute o schema durante a ativação: a versão atual fecha INSERT público.

## 1. Criar o projeto
1. Acesse https://supabase.com/ e crie uma conta/projeto.
2. Escolha uma senha forte para o banco e guarde-a em local seguro.
3. Aguarde o projeto ficar pronto.

## 2. Criar as tabelas e regras de segurança
1. No projeto Supabase, abra **SQL Editor**.
2. Abra o arquivo `supabase/schema.sql` deste repositório, copie todo o conteúdo e cole no SQL Editor.
3. Clique em **Run**.

As regras permitem que qualquer pessoa envie uma manifestação, mas somente usuários cadastrados como administradores podem consultar os registros. Visitantes não conseguem ler as reclamações.

## 3. Criar a conta administrativa
1. No Supabase, abra **Authentication → Users**.
2. Adicione um usuário com o e-mail administrativo e uma senha forte.
3. Copie o **User UID** desse usuário.
4. No SQL Editor, execute (substituindo pelo UID real, sem os sinais < >):

```sql
insert into public.admins (user_id)
values ('COLE-AQUI-O-USER-UID');
```

Somente esse usuário terá acesso ao painel. Para adicionar outro administrador, repita o procedimento com outro UID.

## 4. Configurar o site
1. No Supabase, abra **Project Settings → API** (ou **Data API**, conforme a versão do painel).
2. Copie a **Project URL**.
3. Copie a chave pública **anon / publishable**. Ela pode ficar no código do navegador, pois as permissões são controladas pelas políticas RLS.
4. No GitHub, abra `Site-reclamacoes/Sugestões e melhorias.html`.
5. Procure as linhas `SUPABASE_URL` e `SUPABASE_ANON_KEY` e substitua os textos de configuração pelos valores do seu projeto.
6. Salve a alteração com **Commit changes**.

**Nunca** use a chave `service_role` ou uma chave secreta no HTML, no GitHub ou em mensagens. Essas chaves dão acesso privilegiado ao banco.

## 5. Testar
1. Abra o site público e envie uma manifestação de teste.
2. Abra `admin.html` no endereço do site e entre no painel administrativo com o e-mail e a senha criados.
3. Confirme que a manifestação aparece na lista.
4. Teste em uma janela anônima: o painel não deve mostrar dados sem autenticação.

## Privacidade
CPF e telefone são opcionais. Colete-os apenas quando necessários para a finalidade da manifestação. Defina um prazo de retenção e uma política de privacidade compatíveis com a finalidade do serviço.

## Endereço do site
https://jhonnymrn.github.io/central-de-sugestoes-e-melhorias/
