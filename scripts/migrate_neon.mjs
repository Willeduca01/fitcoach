import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL não encontrada no arquivo .env!');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log('🚀 Iniciando migração do banco de dados no Neon Postgres...');
  console.log('📡 Conectando ao host Neon...');

  try {
    // 1. Extensões
    console.log('📦 1/8 Habilitando extensões...');
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;

    // 2. Schema de compatibilidade Auth
    console.log('🔒 2/8 Configurando schemas e funções de compatibilidade...');
    await sql`CREATE SCHEMA IF NOT EXISTS auth`;
    await sql`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `;
    await sql`
      CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.role', true), '')::text;
      $$;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE,
        raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    // 3. Perfis e Perfis de Personal
    console.log('👤 3/8 Criando tabelas profiles e personal_profiles...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        role TEXT NOT NULL CHECK (role IN ('PERSONAL', 'STUDENT', 'MASTER')),
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.personal_profiles (
        id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
        title TEXT DEFAULT 'Personal Trainer & Consultor Fitness',
        cref TEXT,
        bio TEXT,
        pix_key TEXT,
        pix_type TEXT CHECK (pix_type IN ('CPF', 'EMAIL', 'TELEFONE', 'ALEATORIA')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 4. CRM de Alunos, Treinos e Avaliações
    console.log('🏋️ 4/8 Criando tabelas students, workouts e physical_assessments...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.students (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        avatar_url TEXT,
        status TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status IN ('ATIVO', 'INATIVO', 'PENDENTE')),
        plan TEXT NOT NULL DEFAULT 'MENSAL' CHECK (plan IN ('MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
        monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day BETWEEN 1 AND 31),
        payment_status TEXT NOT NULL DEFAULT 'EM_DIA' CHECK (payment_status IN ('EM_DIA', 'VENCE_EM_BREVE', 'ATRASADO')),
        start_date DATE NOT NULL DEFAULT CURRENT_DATE,
        primary_goal TEXT,
        streak_days INTEGER NOT NULL DEFAULT 0,
        next_assessment_date DATE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.workouts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        focus TEXT NOT NULL,
        exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.physical_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        weight_kg NUMERIC(5, 2) NOT NULL,
        height_cm NUMERIC(5, 1) NOT NULL,
        body_fat_percentage NUMERIC(4, 1),
        chest_cm NUMERIC(5, 1),
        arms_cm NUMERIC(5, 1),
        waist_cm NUMERIC(5, 1),
        hips_cm NUMERIC(5, 1),
        thighs_cm NUMERIC(5, 1),
        photos JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 5. Invoices, Sessions, Messages
    console.log('💳 5/8 Criando tabelas invoices, sessions e messages...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PAGO', 'PENDENTE', 'ATRASADO')),
        payment_method TEXT DEFAULT 'PIX',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        location TEXT DEFAULT 'SmartFit - Unidade Paulista',
        status TEXT NOT NULL DEFAULT 'AGENDADA' CHECK (status IN ('AGENDADA', 'REALIZADA', 'CANCELADA')),
        workout_routine_id UUID REFERENCES public.workouts(id) ON DELETE SET NULL,
        routine_name TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        personal_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
        sender_role TEXT NOT NULL CHECK (sender_role IN ('PERSONAL', 'STUDENT')),
        sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        sender_name TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GERAL' CHECK (category IN ('DUVIDA', 'AGENDAMENTO', 'PAGAMENTO', 'AVALIACAO', 'GERAL')),
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 6. Invites e Rate Limiting
    console.log('🎟️ 6/8 Criando tabelas invites e rate_limit_logs...');
    await sql`
      CREATE TABLE IF NOT EXISTS public.invites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('PERSONAL', 'STUDENT')),
        created_by UUID,
        personal_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        target_name TEXT,
        target_email TEXT,
        plan TEXT DEFAULT 'MENSAL',
        status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'USADO', 'EXPIRADO', 'REVOGADO')),
        used_by UUID,
        used_at TIMESTAMPTZ,
        expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
        id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        action TEXT NOT NULL,
        identifier TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    // 7. Funções e Stored Procedures
    console.log('⚡ 7/8 Criando funções auxiliares e validação de convites...');
    await sql`
      CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
      RETURNS BOOLEAN AS $$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'MASTER'
        );
      $$ LANGUAGE sql STABLE SECURITY DEFINER;
    `;

    await sql`
      CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
        p_action TEXT,
        p_identifier TEXT,
        p_max_attempts INT,
        p_window_seconds INT
      )
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        recent_attempts INT;
      BEGIN
        SELECT COUNT(*) INTO recent_attempts
        FROM public.rate_limit_logs
        WHERE action = p_action
          AND identifier = p_identifier
          AND created_at > NOW() - (p_window_seconds * INTERVAL '1 second');

        IF recent_attempts >= p_max_attempts THEN
          RETURN FALSE;
        END IF;

        INSERT INTO public.rate_limit_logs (action, identifier)
        VALUES (p_action, p_identifier);

        RETURN TRUE;
      END;
      $$;
    `;

    await sql`
      CREATE OR REPLACE FUNCTION public.validate_invite(invite_code TEXT)
      RETURNS TABLE (
        valid BOOLEAN,
        invite_type TEXT,
        target_name TEXT,
        target_email TEXT,
        plan TEXT,
        personal_id UUID,
        personal_name TEXT
      )
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        found_invite RECORD;
        p_name TEXT;
        clean_code TEXT;
      BEGIN
        clean_code := UPPER(TRIM(COALESCE(invite_code, '')));

        SELECT * INTO found_invite
        FROM public.invites
        WHERE UPPER(code) = clean_code
          AND status = 'PENDENTE'
          AND (expires_at IS NULL OR expires_at > NOW())
        LIMIT 1;

        IF found_invite.id IS NULL THEN
          RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TEXT;
          RETURN;
        END IF;

        IF found_invite.type = 'STUDENT' AND found_invite.personal_id IS NOT NULL THEN
          SELECT name INTO p_name FROM public.profiles WHERE id = found_invite.personal_id;
        ELSE
          p_name := 'Administrador / Desenvolvedor';
        END IF;

        RETURN QUERY SELECT
          TRUE,
          found_invite.type,
          found_invite.target_name,
          found_invite.target_email,
          found_invite.plan,
          found_invite.personal_id,
          COALESCE(p_name, 'Personal Trainer');
      END;
      $$;
    `;

    // 8. Seed inicial do Usuário Master e Convite Demo
    console.log('🌱 8/8 Populando usuário Master inicial e convites...');
    await sql`
      INSERT INTO public.profiles (id, role, name, email, phone)
      VALUES (
        '00000000-0000-0000-0000-000000000001',
        'MASTER',
        'Desenvolvedor Master',
        'dev.dev@fitcoach.com.br',
        '(11) 99999-0000'
      )
      ON CONFLICT (email) DO UPDATE
      SET role = 'MASTER', name = EXCLUDED.name;
    `;

    await sql`
      INSERT INTO public.profiles (id, role, name, email, phone)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'PERSONAL',
        'Professor Demo',
        'teste@fitcoach.com.br',
        '(11) 98888-7777'
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    await sql`
      INSERT INTO public.personal_profiles (id, title, cref, bio, pix_key, pix_type)
      VALUES (
        '00000000-0000-0000-0000-000000000002',
        'Personal Trainer & Especialista em Hipertrofia',
        '012345-G/SP',
        'Treinador certificado com mais de 8 anos de experiência em musculação e preparação física.',
        'teste@fitcoach.com.br',
        'EMAIL'
      )
      ON CONFLICT (id) DO NOTHING;
    `;

    await sql`
      INSERT INTO public.invites (code, type, target_name, plan, status)
      VALUES ('PROF-MESTRE-2026', 'PERSONAL', 'Professor Convidado', 'ANUAL', 'PENDENTE')
      ON CONFLICT (code) DO NOTHING;
    `;

    console.log('🎉 Migração concluída com 100% de sucesso no Neon Postgres!');
  } catch (err) {
    console.error('❌ Erro durante a migração:', err);
    process.exit(1);
  }
}

runMigration();
