-- ============================================================================
-- FITCOACH PRO — PARTE 1: TABELAS E EXTENSÕES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfis de Usuário (espelho sincronizado de auth.users com RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('PERSONAL', 'STUDENT')),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Perfil Detalhado do Personal Trainer
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

-- 3. Ficha CRM dos Alunos (Vinculados a um Personal Trainer)
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

-- 4. Treinos e Exercícios
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

-- 5. Avaliações Físicas & Medidas Corporais (Evolução)
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

-- 6. Financeiro: Mensalidades e Faturas
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

-- 7. Agenda de Treinos
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

-- 8. Mensagens / Mini CRM Chat Interno
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


-- ============================================================================
-- FITCOACH PRO — PARTE 2: FUNÇÕES, TRIGGERS E ÍNDICES
-- ============================================================================

-- 1. Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Triggers de updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_personal_profiles_updated_at ON public.personal_profiles;
CREATE TRIGGER set_personal_profiles_updated_at BEFORE UPDATE ON public.personal_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_students_updated_at ON public.students;
CREATE TRIGGER set_students_updated_at BEFORE UPDATE ON public.students
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_workouts_updated_at ON public.workouts;
CREATE TRIGGER set_workouts_updated_at BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_invoices_updated_at ON public.invoices;
CREATE TRIGGER set_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Trigger para criar perfil automaticamente no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    user_name TEXT;
BEGIN
    user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'PERSONAL');
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    INSERT INTO public.profiles (id, role, name, email, avatar_url)
    VALUES (
        NEW.id,
        user_role,
        user_name,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        role = EXCLUDED.role;

    IF user_role = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer & Consultor', 'EMAIL')
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_students_personal_id ON public.students(personal_id);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_student_id ON public.workouts(student_id);
CREATE INDEX IF NOT EXISTS idx_workouts_personal_id ON public.workouts(personal_id);
CREATE INDEX IF NOT EXISTS idx_assessments_student_id ON public.physical_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_sessions_personal_date ON public.sessions(personal_id, date);
CREATE INDEX IF NOT EXISTS idx_messages_student_personal ON public.messages(student_id, personal_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);


-- ============================================================================
-- FITCOACH PRO — PARTE 3: ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- ============================================================================

-- 1. Funções Helper para RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_student_ids()
RETURNS TABLE (id UUID) AS $$
    SELECT id FROM public.students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas para PROFILES
DROP POLICY IF EXISTS "Perfis visiveis para usuarios autenticados" ON public.profiles;
CREATE POLICY "Perfis visiveis para usuarios autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR
        EXISTS (SELECT 1 FROM public.students WHERE personal_id = auth.uid() AND user_id = profiles.id) OR
        EXISTS (SELECT 1 FROM public.students WHERE user_id = auth.uid() AND personal_id = profiles.id)
    );

DROP POLICY IF EXISTS "Usuarios podem atualizar seu proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios podem atualizar seu proprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Usuarios podem inserir seu proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios podem inserir seu proprio perfil"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 4. Políticas para PERSONAL_PROFILES
DROP POLICY IF EXISTS "Qualquer usuario autenticado pode ver perfil do personal" ON public.personal_profiles;
CREATE POLICY "Qualquer usuario autenticado pode ver perfil do personal"
    ON public.personal_profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Personal gerencia seu proprio perfil profissional" ON public.personal_profiles;
CREATE POLICY "Personal gerencia seu proprio perfil profissional"
    ON public.personal_profiles FOR ALL
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5. Políticas para STUDENTS (Ficha CRM)
DROP POLICY IF EXISTS "Personal gerencia todos os seus alunos" ON public.students;
CREATE POLICY "Personal gerencia todos os seus alunos"
    ON public.students FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode ver sua propria ficha" ON public.students;
CREATE POLICY "Aluno pode ver sua propria ficha"
    ON public.students FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 6. Políticas para WORKOUTS (Treinos)
DROP POLICY IF EXISTS "Personal gerencia treinos dos seus alunos" ON public.workouts;
CREATE POLICY "Personal gerencia treinos dos seus alunos"
    ON public.workouts FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode ver seus treinos" ON public.workouts;
CREATE POLICY "Aluno pode ver seus treinos"
    ON public.workouts FOR SELECT
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()));

DROP POLICY IF EXISTS "Aluno pode atualizar status de conclusao dos exercicios" ON public.workouts;
CREATE POLICY "Aluno pode atualizar status de conclusao dos exercicios"
    ON public.workouts FOR UPDATE
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()))
    WITH CHECK (student_id IN (SELECT id FROM public.current_student_ids()));

-- 7. Políticas para PHYSICAL_ASSESSMENTS (Evolução & Medidas)
DROP POLICY IF EXISTS "Personal gerencia avaliacoes dos seus alunos" ON public.physical_assessments;
CREATE POLICY "Personal gerencia avaliacoes dos seus alunos"
    ON public.physical_assessments FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode ver suas proprias avaliacoes" ON public.physical_assessments;
CREATE POLICY "Aluno pode ver suas proprias avaliacoes"
    ON public.physical_assessments FOR SELECT
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()));

-- 8. Políticas para INVOICES (Financeiro / Mensalidades)
DROP POLICY IF EXISTS "Personal gerencia faturas dos seus alunos" ON public.invoices;
CREATE POLICY "Personal gerencia faturas dos seus alunos"
    ON public.invoices FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode ver suas proprias faturas" ON public.invoices;
CREATE POLICY "Aluno pode ver suas proprias faturas"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()));

-- 9. Políticas para SESSIONS (Agenda)
DROP POLICY IF EXISTS "Personal gerencia sessoes da sua agenda" ON public.sessions;
CREATE POLICY "Personal gerencia sessoes da sua agenda"
    ON public.sessions FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode ver suas sessoes agendadas" ON public.sessions;
CREATE POLICY "Aluno pode ver suas sessoes agendadas"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()));

-- 10. Políticas para MESSAGES (Mini CRM Chat)
DROP POLICY IF EXISTS "Personal acessa mensagens dos seus alunos" ON public.messages;
CREATE POLICY "Personal acessa mensagens dos seus alunos"
    ON public.messages FOR ALL
    TO authenticated
    USING (personal_id = auth.uid())
    WITH CHECK (personal_id = auth.uid());

DROP POLICY IF EXISTS "Aluno acessa suas proprias mensagens" ON public.messages;
CREATE POLICY "Aluno acessa suas proprias mensagens"
    ON public.messages FOR SELECT
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()));

DROP POLICY IF EXISTS "Aluno pode enviar mensagens para seu personal" ON public.messages;
CREATE POLICY "Aluno pode enviar mensagens para seu personal"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND
        student_id IN (SELECT id FROM public.current_student_ids())
    );

DROP POLICY IF EXISTS "Aluno pode marcar mensagens como lidas" ON public.messages;
CREATE POLICY "Aluno pode marcar mensagens como lidas"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (student_id IN (SELECT id FROM public.current_student_ids()))
    WITH CHECK (student_id IN (SELECT id FROM public.current_student_ids()));
