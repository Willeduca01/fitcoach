-- ============================================================================
-- FITCOACH PRO — PARTE 5: PAPEL 'MASTER' (DESENVOLVEDOR / ADMIN GLOBAL)
-- ============================================================================

-- 1. Atualizar Constraint de Papéis em public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('PERSONAL', 'STUDENT', 'MASTER'));

-- 2. Função Helper: is_master
CREATE OR REPLACE FUNCTION public.is_master(user_uuid UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'MASTER'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Atualizar Políticas de RLS para Acesso Global do Master
DROP POLICY IF EXISTS "Master pode ver todos os perfis" ON public.profiles;
CREATE POLICY "Master pode ver todos os perfis"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver todos os perfis de personal" ON public.personal_profiles;
CREATE POLICY "Master pode ver todos os perfis de personal"
    ON public.personal_profiles FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver e gerenciar todos os alunos" ON public.students;
CREATE POLICY "Master pode ver e gerenciar todos os alunos"
    ON public.students FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode ver todas as faturas" ON public.invoices;
CREATE POLICY "Master pode ver todas as faturas"
    ON public.invoices FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

DROP POLICY IF EXISTS "Master pode gerenciar todos os convites" ON public.invites;
CREATE POLICY "Master pode gerenciar todos os convites"
    ON public.invites FOR ALL
    TO authenticated
    USING (public.is_master(auth.uid()))
    WITH CHECK (public.is_master(auth.uid()));

-- 4. Atualizar Trigger handle_new_user para suportar papel MASTER diretamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    input_invite_code TEXT;
    found_invite RECORD;
    user_name TEXT;
    user_phone TEXT;
    direct_role TEXT;
BEGIN
    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
    user_phone := NEW.raw_user_meta_data->>'phone';
    direct_role := UPPER(COALESCE(NEW.raw_user_meta_data->>'role', ''));

    -- Se for usuário MASTER (criado pelo admin)
    IF direct_role = 'MASTER' THEN
        INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
        VALUES (
            NEW.id,
            'MASTER',
            COALESCE(user_name, 'Desenvolvedor Master'),
            NEW.email,
            user_phone,
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
        )
        ON CONFLICT (id) DO UPDATE SET
            role = 'MASTER',
            name = EXCLUDED.name,
            email = EXCLUDED.email;
        RETURN NEW;
    END IF;

    -- Caso contrário, exige código de convite obrigatório
    input_invite_code := UPPER(TRIM(COALESCE(NEW.raw_user_meta_data->>'invite_code', '')));

    IF input_invite_code IS NULL OR input_invite_code = '' THEN
        RAISE EXCEPTION 'Acesso restrito: É necessário um código de convite válido para criar uma conta no FitCoach Pro.';
    END IF;

    -- Localiza o convite
    SELECT * INTO found_invite
    FROM public.invites
    WHERE UPPER(code) = input_invite_code
      AND status = 'PENDENTE'
      AND (expires_at IS NULL OR expires_at > NOW())
    FOR UPDATE;

    IF found_invite.id IS NULL THEN
        RAISE EXCEPTION 'Convite inválido, já utilizado ou expirado.';
    END IF;

    -- Cria o perfil com a role do convite
    INSERT INTO public.profiles (id, role, name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        found_invite.type,
        COALESCE(found_invite.target_name, user_name),
        NEW.email,
        user_phone,
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'
    )
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        email = EXCLUDED.email;

    IF found_invite.type = 'PERSONAL' THEN
        INSERT INTO public.personal_profiles (id, title, pix_type)
        VALUES (NEW.id, 'Personal Trainer & Consultor', 'EMAIL')
        ON CONFLICT (id) DO NOTHING;

    ELSIF found_invite.type = 'STUDENT' THEN
        IF found_invite.personal_id IS NULL THEN
            RAISE EXCEPTION 'Erro: O convite do aluno deve estar vinculado a um Personal Trainer.';
        END IF;

        INSERT INTO public.students (
            personal_id,
            user_id,
            name,
            email,
            phone,
            status,
            plan,
            monthly_fee,
            due_day,
            payment_status,
            start_date,
            primary_goal
        ) VALUES (
            found_invite.personal_id,
            NEW.id,
            COALESCE(found_invite.target_name, user_name),
            NEW.email,
            user_phone,
            'ATIVO',
            COALESCE(found_invite.plan, 'MENSAL'),
            350.00,
            10,
            'EM_DIA',
            CURRENT_DATE,
            'Hipertrofia e Condicionamento'
        );
    END IF;

    -- Invalida o convite usado
    UPDATE public.invites
    SET status = 'USADO',
        used_by = NEW.id,
        used_at = NOW()
    WHERE id = found_invite.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
