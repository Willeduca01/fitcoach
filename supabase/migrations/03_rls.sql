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
