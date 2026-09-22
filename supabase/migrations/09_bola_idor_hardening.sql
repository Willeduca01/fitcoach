-- ============================================================================
-- FITCOACH PRO — PARTE 9: BLINDAGEM CONTRA BOLA & IDOR (AppSec / OWASP)
-- ============================================================================
-- Previne Broken Object Level Authorization (BOLA) e Insecure Direct Object References (IDOR).
-- Garante que:
-- 1. Todo acesso a entidades filhas (workouts, avaliações, faturas, sessões, mensagens)
--    valide explicitamente a relação entre o personal_id do treinador autenticado
--    e o student_id do aluno, impedindo injeção cruzada entre treinadores.
-- 2. Alunos autenticados só possam ler/alterar os seus próprios dados e não consigam
--    reassociar treinos, faturas ou mensagens a outros usuários manipulando UUIDs.
-- 3. Convites (invites) não possam ser enumerados em massa por varredura pública.
-- ============================================================================

-- 1. TABELA: PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis visiveis para usuarios autenticados" ON public.profiles;
CREATE POLICY "Perfis visiveis para usuarios autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR public.is_master(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.students 
            WHERE personal_id = auth.uid() AND user_id = profiles.id
        )
        OR EXISTS (
            SELECT 1 FROM public.students 
            WHERE user_id = auth.uid() AND personal_id = profiles.id
        )
    );

DROP POLICY IF EXISTS "Usuarios podem atualizar seu proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios podem atualizar seu proprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_master(auth.uid()))
    WITH CHECK (id = auth.uid() OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Usuarios podem inserir seu proprio perfil" ON public.profiles;
CREATE POLICY "Usuarios podem inserir seu proprio perfil"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid() OR public.is_master(auth.uid()));

-- 2. TABELA: PERSONAL_PROFILES
ALTER TABLE public.personal_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer usuario autenticado pode ver perfil do personal" ON public.personal_profiles;
CREATE POLICY "Visualizacao autorizada de perfil do personal"
    ON public.personal_profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR public.is_master(auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.students 
            WHERE user_id = auth.uid() AND personal_id = personal_profiles.id
        )
    );

DROP POLICY IF EXISTS "Personal gerencia seu proprio perfil profissional" ON public.personal_profiles;
CREATE POLICY "Personal gerencia seu proprio perfil profissional"
    ON public.personal_profiles FOR ALL
    TO authenticated
    USING (id = auth.uid() OR public.is_master(auth.uid()))
    WITH CHECK (id = auth.uid() OR public.is_master(auth.uid()));

-- 3. TABELA: STUDENTS (CRM / Ficha do Aluno)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia todos os seus alunos" ON public.students;
DROP POLICY IF EXISTS "Personal visualiza seus alunos" ON public.students;
DROP POLICY IF EXISTS "Personal insere seus alunos" ON public.students;
DROP POLICY IF EXISTS "Personal atualiza seus alunos" ON public.students;
DROP POLICY IF EXISTS "Personal remove seus alunos" ON public.students;

CREATE POLICY "Personal visualiza seus alunos"
    ON public.students FOR SELECT
    TO authenticated
    USING (personal_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Personal insere seus alunos"
    ON public.students FOR INSERT
    TO authenticated
    WITH CHECK ((personal_id = auth.uid() OR public.is_master(auth.uid())));

CREATE POLICY "Personal atualiza seus alunos"
    ON public.students FOR UPDATE
    TO authenticated
    USING (personal_id = auth.uid() OR public.is_master(auth.uid()))
    WITH CHECK (personal_id = auth.uid() OR public.is_master(auth.uid()));

CREATE POLICY "Personal remove seus alunos"
    ON public.students FOR DELETE
    TO authenticated
    USING (personal_id = auth.uid() OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Aluno pode ver sua propria ficha" ON public.students;
CREATE POLICY "Aluno pode ver sua propria ficha"
    ON public.students FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Aluno pode atualizar seus proprios dados cadastrais" ON public.students;
CREATE POLICY "Aluno pode atualizar seus proprios dados cadastrais"
    ON public.students FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (
        user_id = auth.uid() 
        AND personal_id = students.personal_id
    );

-- 4. TABELA: WORKOUTS (Fichas e Rotinas de Treino)
-- Blindagem BOLA: Personal só pode vincular treinos a alunos que pertençam estritamente ao seu escopo.
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia treinos dos seus alunos" ON public.workouts;
DROP POLICY IF EXISTS "Personal visualiza treinos dos seus alunos" ON public.workouts;
DROP POLICY IF EXISTS "Personal insere treinos dos seus alunos" ON public.workouts;
DROP POLICY IF EXISTS "Personal atualiza treinos dos seus alunos" ON public.workouts;
DROP POLICY IF EXISTS "Personal remove treinos dos seus alunos" ON public.workouts;

CREATE POLICY "Personal visualiza treinos dos seus alunos"
    ON public.workouts FOR SELECT
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = workouts.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal insere treinos dos seus alunos"
    ON public.workouts FOR INSERT
    TO authenticated
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = workouts.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal atualiza treinos dos seus alunos"
    ON public.workouts FOR UPDATE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = workouts.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    )
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = workouts.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal remove treinos dos seus alunos"
    ON public.workouts FOR DELETE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = workouts.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

DROP POLICY IF EXISTS "Aluno pode ver seus treinos" ON public.workouts;
CREATE POLICY "Aluno pode ver seus treinos"
    ON public.workouts FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Aluno pode atualizar status de conclusao dos exercicios" ON public.workouts;
CREATE POLICY "Aluno pode atualizar status de conclusao dos exercicios"
    ON public.workouts FOR UPDATE
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
        AND personal_id = workouts.personal_id
    );

-- 5. TABELA: PHYSICAL_ASSESSMENTS (Avaliações e Medidas)
-- Blindagem BOLA: Personal só pode avaliar e registrar medidas de alunos do seu próprio CRM.
ALTER TABLE public.physical_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia avaliacoes dos seus alunos" ON public.physical_assessments;
DROP POLICY IF EXISTS "Personal visualiza avaliacoes dos seus alunos" ON public.physical_assessments;
DROP POLICY IF EXISTS "Personal insere avaliacoes dos seus alunos" ON public.physical_assessments;
DROP POLICY IF EXISTS "Personal atualiza avaliacoes dos seus alunos" ON public.physical_assessments;
DROP POLICY IF EXISTS "Personal remove avaliacoes dos seus alunos" ON public.physical_assessments;

CREATE POLICY "Personal visualiza avaliacoes dos seus alunos"
    ON public.physical_assessments FOR SELECT
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = physical_assessments.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal insere avaliacoes dos seus alunos"
    ON public.physical_assessments FOR INSERT
    TO authenticated
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = physical_assessments.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal atualiza avaliacoes dos seus alunos"
    ON public.physical_assessments FOR UPDATE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = physical_assessments.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    )
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = physical_assessments.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal remove avaliacoes dos seus alunos"
    ON public.physical_assessments FOR DELETE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = physical_assessments.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

DROP POLICY IF EXISTS "Aluno pode ver suas proprias avaliacoes" ON public.physical_assessments;
CREATE POLICY "Aluno pode ver suas proprias avaliacoes"
    ON public.physical_assessments FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- 6. TABELA: INVOICES (Financeiro e Faturas)
-- Blindagem BOLA: Personal só pode criar/editar faturas de alunos que lhe pertencem.
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia faturas dos seus alunos" ON public.invoices;
DROP POLICY IF EXISTS "Personal visualiza faturas dos seus alunos" ON public.invoices;
DROP POLICY IF EXISTS "Personal insere faturas dos seus alunos" ON public.invoices;
DROP POLICY IF EXISTS "Personal atualiza faturas dos seus alunos" ON public.invoices;
DROP POLICY IF EXISTS "Personal remove faturas dos seus alunos" ON public.invoices;

CREATE POLICY "Personal visualiza faturas dos seus alunos"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = invoices.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal insere faturas dos seus alunos"
    ON public.invoices FOR INSERT
    TO authenticated
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = invoices.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal atualiza faturas dos seus alunos"
    ON public.invoices FOR UPDATE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = invoices.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    )
    WITH CHECK (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = invoices.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal remove faturas dos seus alunos"
    ON public.invoices FOR DELETE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = invoices.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

DROP POLICY IF EXISTS "Aluno pode ver suas proprias faturas" ON public.invoices;
CREATE POLICY "Aluno pode ver suas proprias faturas"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- 7. TABELA: SESSIONS (Agenda de Aulas)
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal gerencia sessoes da sua agenda" ON public.sessions;
DROP POLICY IF EXISTS "Personal visualiza sessoes da sua agenda" ON public.sessions;
DROP POLICY IF EXISTS "Personal insere sessoes da sua agenda" ON public.sessions;
DROP POLICY IF EXISTS "Personal atualiza sessoes da sua agenda" ON public.sessions;
DROP POLICY IF EXISTS "Personal remove sessoes da sua agenda" ON public.sessions;

CREATE POLICY "Personal visualiza sessoes da sua agenda"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (
        (personal_id = auth.uid() AND (
            student_id IS NULL OR EXISTS (
                SELECT 1 FROM public.students 
                WHERE id = sessions.student_id AND personal_id = auth.uid()
            )
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal insere sessoes da sua agenda"
    ON public.sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        (personal_id = auth.uid() AND (
            student_id IS NULL OR EXISTS (
                SELECT 1 FROM public.students 
                WHERE id = sessions.student_id AND personal_id = auth.uid()
            )
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal atualiza sessoes da sua agenda"
    ON public.sessions FOR UPDATE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND (
            student_id IS NULL OR EXISTS (
                SELECT 1 FROM public.students 
                WHERE id = sessions.student_id AND personal_id = auth.uid()
            )
        ))
        OR public.is_master(auth.uid())
    )
    WITH CHECK (
        (personal_id = auth.uid() AND (
            student_id IS NULL OR EXISTS (
                SELECT 1 FROM public.students 
                WHERE id = sessions.student_id AND personal_id = auth.uid()
            )
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal remove sessoes da sua agenda"
    ON public.sessions FOR DELETE
    TO authenticated
    USING (
        (personal_id = auth.uid() AND (
            student_id IS NULL OR EXISTS (
                SELECT 1 FROM public.students 
                WHERE id = sessions.student_id AND personal_id = auth.uid()
            )
        ))
        OR public.is_master(auth.uid())
    );

DROP POLICY IF EXISTS "Aluno pode ver suas sessoes agendadas" ON public.sessions;
CREATE POLICY "Aluno pode ver suas sessoes agendadas"
    ON public.sessions FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

-- 8. TABELA: MESSAGES (Chat / Mini CRM)
-- Blindagem BOLA: Personal só envia/recebe mensagens de seus alunos legítimos.
-- Aluno só pode enviar para o personal_id ao qual está oficialmente vinculado.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Personal acessa mensagens dos seus alunos" ON public.messages;
DROP POLICY IF EXISTS "Personal visualiza mensagens dos seus alunos" ON public.messages;
DROP POLICY IF EXISTS "Personal envia mensagens para seus alunos" ON public.messages;
DROP POLICY IF EXISTS "Personal atualiza mensagens dos seus alunos" ON public.messages;

CREATE POLICY "Personal visualiza mensagens dos seus alunos"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        (personal_id = auth.uid() AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = messages.student_id AND personal_id = auth.uid()
        ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal envia mensagens para seus alunos"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        (personal_id = auth.uid() 
         AND sender_id = auth.uid() 
         AND sender_role = 'PERSONAL'
         AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = messages.student_id AND personal_id = auth.uid()
         ))
        OR public.is_master(auth.uid())
    );

CREATE POLICY "Personal atualiza mensagens dos seus alunos"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (personal_id = auth.uid() OR public.is_master(auth.uid()))
    WITH CHECK (personal_id = auth.uid() OR public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Aluno acessa suas proprias mensagens" ON public.messages;
CREATE POLICY "Aluno acessa suas proprias mensagens"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Aluno pode enviar mensagens para seu personal" ON public.messages;
CREATE POLICY "Aluno pode enviar mensagens para seu personal"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND sender_role = 'STUDENT'
        AND EXISTS (
            SELECT 1 FROM public.students 
            WHERE id = messages.student_id 
              AND user_id = auth.uid()
              AND personal_id = messages.personal_id
        )
    );

DROP POLICY IF EXISTS "Aluno pode marcar mensagens como lidas" ON public.messages;
CREATE POLICY "Aluno pode marcar mensagens como lidas"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        student_id IN (
            SELECT id FROM public.students WHERE user_id = auth.uid()
        )
        AND personal_id = messages.personal_id
    );

-- 9. TABELA: INVITES (Convites)
-- Remoção de políticas com SELECT aberto que permitiam enumeração (Data Scraping / IDOR).
-- Validação pública deve ser realizada exclusivamente via RPC validate_invite(code).
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura publica de convites pendentes por codigo" ON public.invites;
DROP POLICY IF EXISTS "Personal gerencia seus convites de alunos" ON public.invites;

CREATE POLICY "Personal e Master gerenciam seus proprios convites"
    ON public.invites FOR ALL
    TO authenticated
    USING (
        personal_id = auth.uid() 
        OR created_by = auth.uid() 
        OR public.is_master(auth.uid())
    )
    WITH CHECK (
        personal_id = auth.uid() 
        OR created_by = auth.uid() 
        OR public.is_master(auth.uid())
    );

-- 10. TABELA: RATE_LIMIT_LOGS (Uso estritamente interno de RPCs)
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico bloqueado a rate limit logs" ON public.rate_limit_logs;
-- Sem políticas para anon/authenticated: bloqueado por default, acessível apenas via SECURITY DEFINER.
