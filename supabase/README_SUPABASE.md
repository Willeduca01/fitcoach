# 🐘 Supabase & FitCoach Pro — Manual de Banco de Dados & RLS

Este documento explica como inicializar o banco de dados PostgreSQL no **Supabase**, rodar o script de migração com **Row Level Security (RLS)** e cadastrar os primeiros usuários.

---

## 🚀 Passo 1: Executar o Script de Criação das Tabelas e RLS

1. Acesse o console do seu projeto no Supabase:
   👉 **https://supabase.com/dashboard/project/xmpbzpdggsonzftueynw**
2. No menu lateral esquerdo, clique no ícone **SQL Editor** (ou acesse a aba *SQL*).
3. Clique em **New Query** (Nova Consulta).
4. Abra o arquivo [**supabase/migrations/20260917000000_fitcoach_schema.sql**](./migrations/20260917000000_fitcoach_schema.sql), copie todo o seu conteúdo e cole no editor do Supabase.
5. Clique no botão verde **Run** (ou pressione Ctrl + Enter / Cmd + Enter).
6. Você verá a mensagem de sucesso: *Success. No rows returned*.

Pronto! Todas as **8 tabelas**, triggers, índices e **políticas RLS de segurança máxima** estão ativas no seu banco de dados.

---

## 👥 Passo 2: Criar o Primeiro Usuário Personal Trainer

Para cadastrar seu usuário no Supabase:

1. No menu lateral esquerdo do Supabase, clique em **Authentication** > **Users**.
2. Clique no botão **Add user** > **Create user**.
3. Preencha:
   - **Email:** seu e-mail de acesso (ex: personal@fitcoach.com).
   - **Password:** sua senha desejada.
   - **Auto Confirm User?** Marque a caixa para ativar imediatamente (sem precisar confirmar link por e-mail).
4. Clique em **Create user**.
5. O trigger automático on_auth_user_created criará automaticamente o registro correspondente na tabela public.profiles com o papel PERSONAL e em public.personal_profiles!

> **Dica:** Para definir o nome e a role explicitamente no cadastro, você pode passar nos metadados:
> `json
> {
>   name: Seu Nome Completo,
>   role: PERSONAL
> }
> `

---

## 🔒 Passo 3: Segurança das Chaves (RLS e Git)

O projeto está configurado com segurança de nível profissional:

1. **Arquivo .env Local:**
   - As chaves reais fornecidas ficam guardadas exclusivamente no seu arquivo .env local.
   - O arquivo [.gitignore](../.gitignore) foi configurado com regras rígidas para **bloquear qualquer envio de .env ou chaves privadas para o GitHub**.
   - O arquivo [.env.example](../.env.example) serve apenas como molde público para quem clonar o projeto no futuro.

2. **Row Level Security (RLS) Ativo:**
   - Mesmo com a chave pública non no frontend, nenhum usuário ou aluno consegue visualizar dados de outro aluno ou de outro personal trainer, pois o próprio banco de dados PostgreSQL bloqueia o acesso via políticas RLS baseadas em uth.uid().

---

## 📊 Passo 4: Popular Dados Iniciais de Teste (Opcional)

Após criar seu usuário Personal Trainer no Supabase Auth:
1. No **SQL Editor** do Supabase, abra uma nova consulta.
2. Copie e cole o conteúdo de [**supabase/seed.sql**](./seed.sql).
3. Clique em **Run**.
4. Os dados de teste (alunos, treinos, faturas e medidas) serão vinculados automaticamente ao seu perfil de Personal Trainer!
