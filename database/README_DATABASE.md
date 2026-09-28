# 🐘 Neon Postgres & FitCoach Pro — Manual de Banco de Dados

Este documento explica como o banco de dados PostgreSQL serverless está estruturado no **Neon Postgres**, com tabelas, índices e segurança de acesso.

---

## 🚀 Arquitetura de Dados no Neon

O FitCoach PRO utiliza **Neon Serverless Postgres** via `@neondatabase/serverless` e pooler de conexões na AWS (`sa-east-1`).

As tabelas principais do sistema são:
1. `profiles`: Usuários do sistema (Personal, Aluno, Master) com hash seguro `pgcrypto` (`bf`).
2. `personal_profiles`: Dados profissionais do personal trainer (CREF, bio, chave PIX).
3. `students`: Ficha completa do aluno vinculado ao personal.
4. `workouts`: Rotinas de treinos e fichas de exercícios (JSONB).
5. `sessions`: Agendamentos e histórico de aulas.
6. `invoices`: Controle financeiro e faturas PIX.
7. `physical_assessments`: Avaliações físicas e evolução antropométrica.
8. `messages`: Chat CRM em tempo real com suporte a mensagens e anexos.
9. `invites`: Sistema de convites oficiais com token de uso único e hash SHA-256.

---

## 🔒 Variáveis de Ambiente

As credenciais seguras do Neon devem ser configuradas no arquivo `.env` local e nas variáveis da Vercel:

```env
DATABASE_URL=postgresql://neondb_owner:***@ep-plain-waterfall-b6p9dwf0-pooler.c-2.sa-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 📊 Migrações

Todas as migrações SQL estruturais e de endurecimento de segurança estão preservadas no diretório `./migrations/`.
